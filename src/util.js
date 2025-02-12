import { EMPTY_ARR } from './constants';

export const isArray = Array.isArray;
export const slice = EMPTY_ARR.slice;
export const assign = Object.assign;

/**
 * Remove a child node from its parent if attached. This is a workaround for
 * IE11 which doesn't support `Element.prototype.remove()`. Using this function
 * is smaller than including a dedicated polyfill.
 * @param {import('./index').ContainerNode} node The node to remove
 */
export function removeNode(node) {
	if (node && node.parentNode) node.parentNode.removeChild(node);
}
