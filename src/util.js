import { EMPTY_ARR, UNDEFINED } from './constants';

export const isArray = Array.isArray;
export const slice = EMPTY_ARR.slice;
export const assign = Object.assign;

/**
 * Shallow-copy a vnode. Like `Object.assign({}, vnode)`, but safe when
 * `Object.prototype` is frozen (e.g. Hardened JS): assigning the vnode's own
 * `constructor: undefined` property to a plain `{}` would hit the frozen
 * `Object.prototype.constructor` and throw, so pre-seed the target with its
 * own `constructor` slot.
 * @template T
 * @param {T} vnode
 * @returns {T}
 */
export const cloneVNode = vnode => assign({ constructor: UNDEFINED }, vnode);

/**
 * Remove a child node from its parent if attached.
 * @param {import('./internal').PreactElement | null} node The node to remove
 */
export function removeNode(node) {
	if (node && node.parentNode) node.remove();
}
