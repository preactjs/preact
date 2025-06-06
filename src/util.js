import { EMPTY_ARR } from './constants';

export const isArray = Array.isArray;
export const slice = EMPTY_ARR.slice;
export const assign = Object.assign;

/**
 * Remove a child node from its parent if attached.
 * @param {import('./internal').PreactElement | null} node The node to remove
 */
export function removeNode(node) {
	if (node && node.parentNode) node.remove();
}
