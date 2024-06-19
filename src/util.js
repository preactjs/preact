import { EMPTY_ARR } from './constants';

export const isArray = Array.isArray;

export let insertBefore;
export let setAttribute;
export let removeAttribute;
export let addEventListener;
export let removeEventListener;
export let removeChild;
export function setup() {
	insertBefore = Node.prototype.insertBefore;
	removeChild = Element.prototype.removeChild;
	setAttribute = Element.prototype.setAttribute;
	removeAttribute = Element.prototype.removeAttribute;
	addEventListener = Element.prototype.addEventListener;
	removeEventListener = Element.prototype.removeEventListener;
}

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
 * @param {preact.ContainerNode} node The node to remove
 */
export function removeNode(node) {
	let parentNode = node.parentNode;
	if (parentNode) removeChild.call(parentNode, node);
}

export const slice = EMPTY_ARR.slice;
