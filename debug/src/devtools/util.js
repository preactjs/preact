// TODO: Use a proper LRU cache?
/** @type {Map<string, number[]>} */
let encoded = new Map();

// Hoisted for perf
const toCodePoint = s => s.codePointAt(0);

/**
 * Convert a string to an array of codepoints
 * @param {string} input
 * @returns {number[]}
 */
export function encode(input) {
	if (!encoded.has(input)) {
		encoded.set(input, input.split('').map(toCodePoint));
	}
	return encoded.get(input);
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
 * Assign properties from `props` to `obj`
 * @template O, P The obj and props types
 * @param {O} obj The object to copy properties to
 * @param {P} props The object to copy properties from
 * @returns {O & P}
 */
export function assign(obj, props) {
	for (let i in props) obj[i] = props[i];
	return /** @type {O & P} */ (obj);
}
