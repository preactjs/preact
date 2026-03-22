import { NULL } from './constants';

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
	let backing = getBacking(vnode);
	return backing != NULL ? backing._children : vnode._children;
}

/**
 * Update the mounted child list for this vnode's current backing node.
 *
 * @param {VNode} vnode
 * @param {Array<VNode<any> | BackingNode | null> | null} children
 * @returns {Array<VNode<any> | BackingNode | null> | null}
 */
export function setOwnedChildren(vnode, children) {
	vnode._children = children;
	let backing = getBacking(vnode);
	if (backing != NULL) {
		backing._children = children;
	}
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

	if (vnode._children != NULL && vnode._children !== children) {
		vnode._children[index] = child;
	}
}

/**
 * Return the first DOM node owned by a vnode's current mounted backing.
 *
 * @param {VNode} vnode
 * @returns {import('./internal').PreactElement | null}
 */
export function getOwnedFirstDom(vnode) {
	let backing = getBacking(vnode);
	return backing != NULL ? backing._firstDom : vnode._dom;
}

/**
 * Return the last DOM node owned by a vnode's current mounted backing.
 *
 * @param {VNode} vnode
 * @returns {import('./internal').PreactElement | null}
 */
export function getOwnedLastDom(vnode) {
	let backing = getBacking(vnode);
	return backing != NULL ? backing._lastDom : vnode._lastDom || vnode._dom;
}

/**
 * Return the anchor DOM node owned by a vnode's current mounted backing.
 *
 * @param {VNode} vnode
 * @returns {import('./internal').PreactElement | null}
 */
export function getOwnedAnchorDom(vnode) {
	let backing = getBacking(vnode);
	return backing != NULL ? backing._anchorDom : vnode._anchorDom || vnode._dom;
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
	vnode._dom = firstDom;
	vnode._lastDom = lastDom;
	vnode._anchorDom = anchorDom;

	let backing = getBacking(vnode);
	if (backing != NULL) {
		backing._firstDom = firstDom;
		backing._lastDom = lastDom;
		backing._anchorDom = anchorDom;
	}
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
	let backing = getBacking(vnode) || vnode._backing;
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
	backing._children = vnode._children;
	backing._firstDom = vnode._dom || NULL;
	backing._lastDom = vnode._lastDom || vnode._dom || NULL;
	backing._anchorDom = vnode._anchorDom || vnode._dom || NULL;

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
