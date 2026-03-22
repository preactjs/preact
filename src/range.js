import { NULL } from './constants';
import { getBacking, getOwnedChildren, syncBackingFromVNode } from './backing';
import { Fragment } from './create-element';

const BOUNDARY_FRAGMENT = 1;
const BOUNDARY_COMPONENT = 2;
const BOUNDARY_SUSPENSE = 3;

/**
 * Return the first DOM node owned by a vnode subtree.
 * @param {import('./internal').VNode} vnode
 * @returns {import('./internal').PreactElement | null}
 */
export function getFirstDom(vnode) {
	let backing = getBacking(vnode);
	return backing != NULL ? backing._firstDom : vnode._dom;
}

/**
 * Return the last DOM node owned by a vnode subtree.
 * @param {import('./internal').VNode} vnode
 * @returns {import('./internal').PreactElement | null}
 */
export function getLastDom(vnode) {
	let backing = getBacking(vnode);
	return backing != NULL ? backing._lastDom : vnode._lastDom || vnode._dom;
}

/**
 * Return the DOM node that should be used as this vnode subtree's anchor.
 * @param {import('./internal').VNode} vnode
 * @returns {import('./internal').PreactElement | null}
 */
export function getAnchorDom(vnode) {
	let backing = getBacking(vnode);
	return backing != NULL ? backing._anchorDom : vnode._anchorDom || vnode._dom;
}

/**
 * Recompute the owned DOM range for a vnode from its rendered children.
 * @param {import('./internal').VNode} vnode
 */
export function updateRangeFromChildren(vnode) {
	let firstDom = NULL;
	let lastDom = NULL;
	let anchorDom = NULL;
	let children = getOwnedChildren(vnode);

	if (children != NULL) {
		for (let i = 0; i < children.length; i++) {
			let child = children[i];
			if (child != NULL && child._dom != NULL) {
				firstDom = child._dom;
				anchorDom = getAnchorDom(child);
				break;
			}
		}

		for (let i = children.length; i--; ) {
			let child = children[i];
			if (child != NULL) {
				lastDom = getLastDom(child);
				if (lastDom != NULL) break;
			}
		}
	}

	vnode._dom = firstDom;
	vnode._lastDom = lastDom;
	vnode._anchorDom = anchorDom;

	if (vnode.type === Fragment) {
		syncBackingFromVNode(vnode, BOUNDARY_FRAGMENT);
	}
}

/**
 * Synchronize a boundary-like vnode into its mounted boundary record.
 * @param {import('./internal').VNode} vnode
 */
export function syncBackingOwnership(vnode) {
	if (vnode.type === Fragment) {
		syncBackingFromVNode(vnode, BOUNDARY_FRAGMENT);
	} else if (vnode._component && vnode._component._childDidSuspend) {
		let backing = syncBackingFromVNode(vnode, BOUNDARY_SUSPENSE);
		backing._activeChild = vnode._component._activeChild || NULL;
		backing._parkedChild = vnode._component._parkedChild || NULL;
		backing._fallbackChild = vnode._component._fallbackChild || NULL;
	} else if (vnode._component) {
		syncBackingFromVNode(vnode, BOUNDARY_COMPONENT);
	}
}
