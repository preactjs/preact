import { NULL } from './constants';
import { getOwnedVNode, getMountedBacking, isBackingNode } from './backing';

/**
 * Return the first DOM node owned by a vnode or backing subtree.
 * @param {import('./internal').VNode | import('./internal').BackingNode} node
 * @returns {import('./internal').PreactElement | null}
 */
export function getFirstDom(node) {
	if (isBackingNode(node)) return node._firstDom;
	let backing = getMountedBacking(node);
	return backing != NULL ? backing._firstDom : NULL;
}

/**
 * Return the last DOM node owned by a vnode or backing subtree.
 * @param {import('./internal').VNode | import('./internal').BackingNode} node
 * @returns {import('./internal').PreactElement | null}
 */
export function getLastDom(node) {
	if (isBackingNode(node)) return node._lastDom;
	let backing = getMountedBacking(node);
	return backing != NULL ? backing._lastDom : NULL;
}

/**
 * Return the anchor DOM node for a vnode or backing subtree.
 * @param {import('./internal').VNode | import('./internal').BackingNode} node
 * @returns {import('./internal').PreactElement | null}
 */
export function getAnchorDom(node) {
	if (isBackingNode(node)) return node._anchorDom;
	let backing = getMountedBacking(node);
	return backing != NULL ? backing._anchorDom : NULL;
}

/**
 * Recompute the owned DOM range for a vnode or backing from its children.
 * @param {import('./internal').VNode | import('./internal').BackingNode} node
 */
export function updateRangeFromChildren(node) {
	let firstDom = NULL;
	let lastDom = NULL;
	let anchorDom = NULL;
	let backing = isBackingNode(node) ? node : getMountedBacking(node);
	let children = backing != NULL ? backing._children : NULL;

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

	if (backing != NULL) {
		backing._firstDom = firstDom;
		backing._lastDom = lastDom;
		backing._anchorDom = anchorDom;
	}
}
