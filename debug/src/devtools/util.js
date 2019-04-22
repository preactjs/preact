// TODO: Use a proper LRU cache?
/** @type {Map<string, Uint32Array>} */
let encoded = new Map();

// Hoisted for perf
const toCodePoint = s => s.codePointAt(0);

/**
 * Convert a string to an Uint32Array
 * @param {string} input
 * @returns {Uint32Array}
 */
export function encode(input) {
	if (!encoded.has(input)) {
		encoded.set(input, Uint32Array.from(input, toCodePoint));
	}
	return encoded.get(input);
}

/**
 * Append an encoded string to an array
 * @param {number[]} arr
 * @param {Uint32Array} input
 */
export function append(arr, input) {
	arr[arr.length] = input.length;
	let len = arr.length;
	for (let i = 0; i < input.length; i++) {
		arr[len + i] = input[i];
	}
}

/**
 * Deeply mutate a property by walking down an array of property keys
 * @param {object} obj
 * @param {Array<string | number>} path
 * @param {any} value
 */
export function setIn(obj, path, value) {
	let last = path.pop();
	let parent = path.reduce((acc, attr) => acc ? acc[attr] : null, obj);
	if (parent) {
		parent[last] = value;
	}
}

/**
 * Get current timestamp in ms. Used for profiling.
 * @returns {number}
 */
export let now = Date.now;

try {
	/* istanbul ignore else */
	now = performance.now.bind(performance);
}
catch (e) {}
