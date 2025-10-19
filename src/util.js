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

/**
 * Check if a value is a function
 * @param {*} value The value to check
 * @returns {boolean}
 */
export function isFunction(value) {
	return typeof value === 'function';
}

/**
 * Check if a value is a string
 * @param {*} value The value to check
 * @returns {boolean}
 */
export function isString(value) {
	return typeof value === 'string';
}

/**
 * Check if a value is defined (not null or undefined)
 * @param {*} value The value to check
 * @returns {boolean}
 */
export function isDefined(value) {
	return value != null;
}
