import { NULL } from './constants';

/**
 * Return the last DOM node owned by a vnode subtree.
 * @param {import('./internal').VNode} vnode
 * @returns {import('./internal').PreactElement | null}
 */
export function getLastDom(vnode) {
	return vnode._lastDom || vnode._dom;
}

/**
 * Return the DOM node that should be used as this vnode subtree's anchor.
 * @param {import('./internal').VNode} vnode
 * @returns {import('./internal').PreactElement | null}
 */
export function getAnchorDom(vnode) {
	return vnode._anchorDom || vnode._dom;
}

/**
 * Recompute the owned DOM range for a vnode from its rendered children.
 * @param {import('./internal').VNode} vnode
 */
export function updateRangeFromChildren(vnode) {
	let firstDom = NULL;
	let lastDom = NULL;
	let anchorDom = NULL;
	let children = vnode._children;

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
}
