import { NULL } from './constants';
import { Fragment } from './create-element';

const BACKING_HOST = 0;
const BACKING_FRAGMENT = 1;
const BACKING_COMPONENT = 2;
const BACKING_SUSPENSE = 3;

/**
 * @typedef {import('./internal').BackingKind} BackingKind
 * @typedef {import('./internal').BackingNode} BackingNode
 * @typedef {import('./internal').VNode} VNode
 */

/**
 * Return the current backing node for this vnode if this vnode is the
 * backing node's current descriptor.
 *
 * @param {VNode} vnode
 * @returns {BackingNode | null}
 */
export function getBacking(vnode) {
	let backing = vnode._backing;
	return backing != NULL && backing._vnode === vnode ? backing : NULL;
}

/**
 * Return the mounted backing node referenced by this descriptor, even if this
 * vnode is no longer the backing node's current descriptor.
 *
 * @param {VNode} vnode
 * @returns {BackingNode | null}
 */
export function getMountedBacking(vnode) {
	return vnode._backing || NULL;
}

/**
 * Return the descriptor child list for this vnode.
 *
 * @param {VNode} vnode
 * @returns {Array<VNode<any> | BackingNode | null> | null}
 */
export function getDescriptorChildren(vnode) {
	return vnode._children;
}

/**
 * Return the current mounted child list for this vnode.
 *
 * @param {VNode} vnode
 * @returns {Array<VNode<any> | BackingNode | null> | null}
 */
export function getOwnedChildren(vnode) {
	let backing = getMountedBacking(vnode);
	return backing != NULL ? backing._children : NULL;
}

/**
 * Update the mounted child list for this vnode's current backing node.
 *
 * @param {VNode} vnode
 * @param {Array<VNode<any> | BackingNode | null> | null} children
 * @returns {Array<VNode<any> | BackingNode | null> | null}
 */
export function setOwnedChildren(vnode, children) {
	let backing = ensureOwnedBacking(vnode);
	backing._children = children;
	return children;
}

/**
 * Replace one mounted child in a parent vnode's current child list.
 *
 * @param {VNode} vnode
 * @param {number} index
 * @param {VNode<any> | BackingNode | null} child
 */
export function replaceOwnedChild(vnode, index, child) {
	let children = getOwnedChildren(vnode);
	if (children != NULL) {
		children[index] = child;
	}
}

/**
 * Return the first DOM node owned by a vnode's current mounted backing.
 *
 * @param {VNode} vnode
 * @returns {import('./internal').PreactElement | null}
 */
export function getOwnedFirstDom(vnode) {
	let backing = getMountedBacking(vnode);
	return backing != NULL ? backing._firstDom : NULL;
}

/**
 * Return the last DOM node owned by a vnode's current mounted backing.
 *
 * @param {VNode} vnode
 * @returns {import('./internal').PreactElement | null}
 */
export function getOwnedLastDom(vnode) {
	let backing = getMountedBacking(vnode);
	return backing != NULL ? backing._lastDom : NULL;
}

/**
 * Return the anchor DOM node owned by a vnode's current mounted backing.
 *
 * @param {VNode} vnode
 * @returns {import('./internal').PreactElement | null}
 */
export function getOwnedAnchorDom(vnode) {
	let backing = getMountedBacking(vnode);
	return backing != NULL ? backing._anchorDom : NULL;
}

/**
 * Update the mounted DOM range for this vnode and its current backing node.
 *
 * @param {VNode} vnode
 * @param {import('./internal').PreactElement | null} firstDom
 * @param {import('./internal').PreactElement | null} lastDom
 * @param {import('./internal').PreactElement | null} anchorDom
 */
export function setOwnedRange(vnode, firstDom, lastDom, anchorDom) {
	let backing = ensureOwnedBacking(vnode);
	backing._firstDom = firstDom;
	backing._lastDom = lastDom;
	backing._anchorDom = anchorDom;
}

function inferBackingKind(vnode) {
	if (vnode.type === Fragment) return BACKING_FRAGMENT;
	if (vnode._component && vnode._component._childDidSuspend)
		return BACKING_SUSPENSE;
	if (vnode._component) return BACKING_COMPONENT;
	return BACKING_HOST;
}

function ensureOwnedBacking(vnode) {
	return ensureBacking(vnode, inferBackingKind(vnode));
}

/**
 * Return an existing backing node or create one for this vnode.
 * Stage 1 scope: backing nodes are only stable storage for ownership.
 * Planner and commit still consume vnode fields directly.
 *
 * @param {VNode} vnode
 * @param {BackingKind} kind
 * @returns {BackingNode}
 */
export function ensureBacking(vnode, kind) {
	let backing = getBacking(vnode);
	if (backing == NULL) {
		backing = vnode._backing = {
			_parent: NULL,
			_vnode: vnode,
			_children: NULL,
			_firstDom: NULL,
			_lastDom: NULL,
			_anchorDom: NULL,
			_kind: kind,
			_activeChild: NULL,
			_parkedChild: NULL,
			_fallbackChild: NULL
		};
	} else {
		backing._vnode = vnode;
		backing._kind = kind;
	}

	return backing;
}

/**
 * Reuse an existing backing node across renders and make the new vnode the
 * current descriptor for that backing node.
 *
 * @param {VNode} vnode
 * @param {BackingNode | null | undefined} backing
 * @returns {BackingNode | null}
 */
export function attachBacking(vnode, backing) {
	if (backing != NULL) {
		vnode._backing = backing;
		backing._vnode = vnode;
	}

	return backing || NULL;
}

/**
 * Reuse the old vnode's backing node for the new vnode.
 *
 * @param {VNode} newVNode
 * @param {VNode} oldVNode
 * @returns {BackingNode | null}
 */
export function reuseBacking(newVNode, oldVNode) {
	return attachBacking(newVNode, oldVNode._backing);
}

/**
 * Synchronize mounted ownership from a vnode onto its backing node.
 *
 * @param {VNode} vnode
 * @param {BackingKind} kind
 * @returns {BackingNode}
 */
export function syncBackingFromVNode(vnode, kind) {
	let backing = ensureBacking(vnode, kind);
	let parentBacking =
		vnode._parent && vnode._parent._backing ? vnode._parent._backing : NULL;

	backing._parent = parentBacking;

	return backing;
}

/**
 * Clear the mounted ownership for an existing backing node.
 *
 * @param {VNode} vnode
 */
export function clearBacking(vnode) {
	let backing = vnode._backing;
	if (backing != NULL) {
		if (backing._vnode === vnode) {
			backing._vnode = NULL;
			backing._children = NULL;
			backing._firstDom = NULL;
			backing._lastDom = NULL;
			backing._anchorDom = NULL;
			backing._activeChild = NULL;
			backing._parkedChild = NULL;
			backing._fallbackChild = NULL;
		}
		vnode._backing = NULL;
	}
}
