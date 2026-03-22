import { NULL } from './constants';
import {
	getOwnedAnchorDom,
	getOwnedChildren,
	getOwnedFirstDom,
	getOwnedLastDom,
	getOwnedVNode,
	isBackingNode,
	setOwnedRange
} from './backing';

/**
 * Return the first DOM node owned by a vnode subtree.
 * @param {import('./internal').VNode | import('./internal').BackingNode} vnode
 * @returns {import('./internal').PreactElement | null}
 */
export function getFirstDom(vnode) {
	return isBackingNode(vnode) ? vnode._firstDom : getOwnedFirstDom(vnode);
}

/**
 * Return the last DOM node owned by a vnode subtree.
 * @param {import('./internal').VNode | import('./internal').BackingNode} vnode
 * @returns {import('./internal').PreactElement | null}
 */
export function getLastDom(vnode) {
	return isBackingNode(vnode) ? vnode._lastDom : getOwnedLastDom(vnode);
}

/**
 * Return the DOM node that should be used as this vnode subtree's anchor.
 * @param {import('./internal').VNode | import('./internal').BackingNode} vnode
 * @returns {import('./internal').PreactElement | null}
 */
export function getAnchorDom(vnode) {
	return isBackingNode(vnode) ? vnode._anchorDom : getOwnedAnchorDom(vnode);
}

/**
 * Recompute the owned DOM range for a vnode from its rendered children.
 * @param {import('./internal').VNode | import('./internal').BackingNode} vnode
 */
export function updateRangeFromChildren(vnode) {
	let firstDom = NULL;
	let lastDom = NULL;
	let anchorDom = NULL;
	let children = isBackingNode(vnode)
		? vnode._children
		: getOwnedChildren(vnode);

	if (children != NULL) {
		for (let i = 0; i < children.length; i++) {
			let child = children[i];
			let childFirstDom = child != NULL ? getFirstDom(child) : NULL;
			if (childFirstDom != NULL) {
				firstDom = childFirstDom;
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

	if (isBackingNode(vnode)) {
		vnode._firstDom = firstDom;
		vnode._lastDom = lastDom;
		vnode._anchorDom = anchorDom;
	} else {
		setOwnedRange(vnode, firstDom, lastDom, anchorDom);
	}
}
