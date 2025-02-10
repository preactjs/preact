import { EMPTY_ARR } from './constants';

export const isArray = Array.isArray;

/**
 * Assign properties from `props` to `obj`
 * @template O, P The obj and props types
 * @param {O} obj The object to copy properties to
 * @param {P} props The object to copy properties from
 * @returns {O & P}
 */
export function assign(obj, props) {
	// @ts-expect-error We change the type of `obj` to be `O & P`
	for (let i in props) obj[i] = props[i];
	return /** @type {O & P} */ (obj);
}

/**
 * Remove a child node from its parent if attached. This is a workaround for
 * IE11 which doesn't support `Element.prototype.remove()`. Using this function
 * is smaller than including a dedicated polyfill.
 * @param {import('./index').ContainerNode} node The node to remove
 */
export function removeNode(node) {
	if (node && node.parentNode) node.parentNode.removeChild(node);
}

/**
 * Checks whether a given node is contained within a specified parent node's subtree.
 * This function is a workaround for Internet Explorer 11's limited support for
 * `Element.prototype.contains()`, which works only for DOM elements and does not
 * support text nodes.
 *
 * @param {import('./internal').PreactElement} parent - The parent node within which to search for the `node`.
 * @param {import('./index').ContainerNode} node - The node to check for containment within the `parent` subtree.
 */
export function contains(parent, node) {
	while (node) {
		if (node === parent) return true;
		node = node.parentNode;
	}
	return false;
}

export const slice = EMPTY_ARR.slice;
