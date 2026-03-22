import { NULL } from './constants';
import { isBackingNode } from './backing';

/**
 * Return the first DOM node owned by a backing node.
 * @param {import('./internal').BackingNode | any} node
 * @returns {import('./internal').PreactElement | null}
 */
export function getFirstDom(node) {
	return isBackingNode(node) ? node._firstDom : NULL;
}

/**
 * Return the last DOM node owned by a backing node.
 * @param {import('./internal').BackingNode | any} node
 * @returns {import('./internal').PreactElement | null}
 */
export function getLastDom(node) {
	return isBackingNode(node) ? node._lastDom : NULL;
}

/**
 * Return the anchor DOM node for a backing node.
 * @param {import('./internal').BackingNode | any} node
 * @returns {import('./internal').PreactElement | null}
 */
export function getAnchorDom(node) {
	return isBackingNode(node) ? node._anchorDom : NULL;
}

/**
 * Recompute the owned DOM range for a backing node from its children.
 * @param {import('./internal').BackingNode} backing
 */
export function updateRangeFromChildren(backing) {
	let firstDom = NULL;
	let lastDom = NULL;
	let anchorDom = NULL;
	let children = backing._children;

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

	backing._firstDom = firstDom;
	backing._lastDom = lastDom;
	backing._anchorDom = anchorDom;
}
