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
