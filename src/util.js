import { EMPTY_ARR, UNDEFINED } from './constants';

export const isArray = Array.isArray;
export const slice = EMPTY_ARR.slice;
export const assign = Object.assign;

/**
 * Shallow-copy a vnode. Equivalent to `Object.assign({}, vnode)` but safe to
 * call when `Object.prototype.constructor` is non-writable (e.g. under
 * Hardened JavaScript — see https://hardenedjs.org/ — or simply after
 * `Object.freeze(Object.prototype)`). Vnodes carry a `constructor: undefined`
 * own property as a JSON-injection guard, and `Object.assign` uses [[Set]]
 * semantics — copying that property to a fresh `{}` walks up to the frozen
 * `Object.prototype.constructor` and throws. Pre-seeding the target with its
 * own `constructor` slot avoids the walk.
 * @template T
 * @param {T} vnode
 * @returns {T}
 */
export const cloneVNode = vnode =>
	assign({ constructor: UNDEFINED }, vnode);

/**
 * Remove a child node from its parent if attached.
 * @param {import('./internal').PreactElement | null} node The node to remove
 */
export function removeNode(node) {
	if (node && node.parentNode) node.remove();
}
