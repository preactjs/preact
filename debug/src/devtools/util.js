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

/**
 * Wrap function with generic error logging
 * @param {*} fn
 */
export function catchErrors(fn) {
	return arg => {
		try {
			return fn(arg);
		}
		catch (e) {
			/* istanbul ignore next */
			console.error('The react devtools encountered an error');
			/* istanbul ignore next */
			console.error(e); // eslint-disable-line no-console
		}
	};
}

/**
 * Detects the currently used devtools version
 * @param {import('../internal').DevtoolsWindow} win
 * @return {number}
 */
export function detectDevtoolsVersion(win) {
	return win.__REACT_DEVTOOLS_ATTACH__!=null || win.__REACT_DEVTOOLS_COMPONENT_FILTERS__!=null
		? 4
		: 3;
}
