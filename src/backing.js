import { NULL, UNDEFINED } from './constants';

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
 * Create a new backing node.
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

// Compat shims for suspense.js — these will be removed when suspense is ported
/** @deprecated */
export function getMountedBacking(vnode) {
	return vnode._backing || NULL;
}
/** @deprecated */
export function getOwnedChildren(vnode) {
	let b = getMountedBacking(vnode);
	return b != NULL ? b._children : NULL;
}
/** @deprecated */
export function getOwnedFirstDom(vnode) {
	let b = getMountedBacking(vnode);
	return b != NULL ? b._firstDom : NULL;
}
/** @deprecated */
export function getOwnedAnchorDom(vnode) {
	let b = getMountedBacking(vnode);
	return b != NULL ? b._anchorDom : NULL;
}
/** @deprecated */
export function setOwnedRange(vnode, firstDom, lastDom, anchorDom) {
	let b = getMountedBacking(vnode);
	if (b != NULL) {
		b._firstDom = firstDom;
		b._lastDom = lastDom;
		b._anchorDom = anchorDom;
	}
}
/** @deprecated */
export function setOwnedChildren(vnode, children) {
	let b = getMountedBacking(vnode);
	if (b != NULL) setBackingChildren(b, children);
}
/** @deprecated */
export function replaceOwnedChild(vnode, index, child) {
	let b = getMountedBacking(vnode);
	if (b != NULL && b._children != NULL) {
		if (child != NULL && isBackingNode(child)) {
			child._parent = b;
		}
		b._children[index] = child;
	}
}
