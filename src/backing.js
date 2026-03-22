import { NULL, UNDEFINED } from './constants';
import { Fragment } from './create-element';

export const BACKING_HOST = 0;
export const BACKING_FRAGMENT = 1;
export const BACKING_COMPONENT = 2;
export const BACKING_SUSPENSE = 3;

/**
 * @typedef {import('./internal').BackingKind} BackingKind
 * @typedef {import('./internal').BackingNode} BackingNode
 * @typedef {import('./internal').VNode} VNode
 */

/**
 * @param {VNode<any> | BackingNode | null} child
 * @returns {child is BackingNode}
 */
export function isBackingNode(child) {
	return child != NULL && child._kind != NULL && child._vnode !== UNDEFINED;
}

/**
 * Resolve a mounted child entry back to its current descriptor vnode.
 *
 * @param {VNode<any> | BackingNode | null} child
 * @returns {VNode<any> | null}
 */
export function getOwnedVNode(child) {
	if (child == NULL) return NULL;
	return isBackingNode(child) ? child._vnode : child;
}

/**
 * Create a new backing node for a vnode.
 *
 * @param {VNode} vnode
 * @param {BackingKind} kind
 * @returns {BackingNode}
 */
export function createBacking(vnode, kind) {
	return {
		_parent: NULL,
		_vnode: vnode,
		_component: NULL,
		_children: NULL,
		_firstDom: NULL,
		_lastDom: NULL,
		_anchorDom: NULL,
		_kind: kind,
		_activeChild: NULL,
		_parkedChild: NULL,
		_fallbackChild: NULL
	};
}

/**
 * Update the backing's current descriptor vnode.
 *
 * @param {BackingNode} backing
 * @param {VNode} vnode
 */
export function updateBackingVNode(backing, vnode) {
	backing._vnode = vnode;
}

/**
 * Set the mounted child list on a backing node, setting parent pointers.
 *
 * @param {BackingNode} backing
 * @param {Array<VNode<any> | BackingNode | null> | null} children
 */
export function setBackingChildren(backing, children) {
	if (children != NULL) {
		for (let i = 0; i < children.length; i++) {
			let child = children[i];
			if (child == NULL) continue;
			if (isBackingNode(child)) {
				child._parent = backing;
			}
		}
	}
	backing._children = children;
}

/**
 * Replace one mounted child in a backing node's child list.
 *
 * @param {BackingNode} backing
 * @param {number} index
 * @param {BackingNode | null} child
 */
export function replaceBackingChild(backing, index, child) {
	let children = backing._children;
	if (children != NULL) {
		if (child != NULL) {
			child._parent = backing;
		}
		children[index] = child;
	}
}

/**
 * Clear the mounted ownership for a backing node.
 *
 * @param {BackingNode} backing
 */
export function clearBacking(backing) {
	if (backing != NULL) {
		backing._vnode = NULL;
		backing._component = NULL;
		backing._children = NULL;
		backing._firstDom = NULL;
		backing._lastDom = NULL;
		backing._anchorDom = NULL;
		backing._activeChild = NULL;
		backing._parkedChild = NULL;
		backing._fallbackChild = NULL;
	}
}
