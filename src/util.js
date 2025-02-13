import { EMPTY_ARR } from './constants';

export const isArray = Array.isArray;
export const slice = EMPTY_ARR.slice;

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
 * Remove a child node from its parent if attached.
 * @param {import('./internal').PreactElement | null} node The node to remove
 */
export function removeNode(node) {
	if (node && node.parentNode) node.remove();
}
