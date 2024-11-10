export const assign = Object.assign;

/**
 * Check if two objects have a different shape
 * @param {object} a
 * @param {object} b
 * @returns {boolean}
 */
export function shallowDiffers(a, b) {
	for (let i in a) if (i !== '__source' && !(i in b)) return true;
	for (let i in b) if (i !== '__source' && a[i] !== b[i]) return true;
	return false;
}

/**
 * Check if two values are the same value
 * @param {*} x
 * @param {*} y
 * @returns {boolean}
 */
export function is(x, y) {
	// TODO: can we replace this with Object.is?
	return (x === y && (x !== 0 || 1 / x === 1 / y)) || (x !== x && y !== y);
}
