import { NON_DIMENSION_PROPS } from './constants';


/** Copy own-properties from `props` onto `obj`.
 *	@returns obj
 *	@private
 */
export function extend(obj, props) {
	if (props) {
		for (let i in props) {
			if (props[i]!==undefined) {
				obj[i] = props[i];
			}
		}
	}
	return obj;
}


/** Fast clone. Note: does not filter out non-own properties.
 *	@see https://esbench.com/bench/56baa34f45df6895002e03b6
 */
export function clone(obj) {
	return extend({}, obj);
}


/** Create a caching wrapper for the given function.
 *	Note: As this method is only used for memoizing string operations, it does not safeguard against Object.prototype manipulation.
 *	@private
 */
export function memoize(fn) {
	let mem = {};
	return k => mem[k] || (mem[k] = fn(k));
}


/** Get a deep property value from the given object, expressed in dot-notation.
 *	@private
 */
export function delve(obj, key) {
	for (let p=key.split('.'), i=0; i<p.length && obj; i++) {
		obj = obj[p[i]];
	}
	return obj;
}


/** Convert an Array-like object to an Array
 *	@private
 */
export function toArray(obj, offset) {
	return [].slice.call(obj, offset);
}


/** @private is the given object a Function? */
export function isFunction(obj) {
	return 'function'===typeof obj;
}


/** @private is the given object a String? */
export function isString(obj) {
	return 'string'===typeof obj;
}


/** Check if a value is `null` or `undefined`.
 *	@private
 */
export function empty(x) {
	return x===undefined || x===null;
}


/** Check if a value is `null`, `undefined`, or explicitly `false`. */
export function falsey(value) {
	return value===false || empty(value);
}


/** Convert a hashmap of styles to CSSText
 *	@private
 */
export function styleObjToCss(s) {
	let str = '';
	for (let prop in s) {
		let val = s[prop];
		if (!empty(val)) {
			if (str) str += ' ';
			str += jsToCss(prop);
			str += ': ';
			str += val;
			if (typeof val==='number' && !NON_DIMENSION_PROPS[prop]) {
				str += 'px';
			}
			str += ';';
		}
	}
	return str;
}



/** Convert a hashmap of CSS classes to a space-delimited className string
 *	@private
 */
export function hashToClassName(c) {
	let str = '';
	for (let prop in c) {
		if (c[prop]) {
			if (str) str += ' ';
			str += prop;
		}
	}
	return str;
}



/** Convert a JavaScript camel-case CSS property name to a CSS property name
 *	@private
 *	@function
 */
export const jsToCss = memoize( s => toLowerCase(s.replace(/([A-Z])/g,'-$1')) );


/** Just a memoized String.prototype.toLowerCase */
export const toLowerCase = memoize( s => s.toLowerCase() );


// For animations, rAF is vastly superior. However, it scores poorly on benchmarks :(
// export const setImmediate = typeof requestAnimationFrame==='function' ? requestAnimationFrame : setTimeout;

/** Call a function asynchronously, as soon as possible.
 *	@param {Function} callback
 */
let resolved = typeof Promise!=='undefined' && Promise.resolve();
export const setImmediate = resolved ? (f => { resolved.then(f); }) : setTimeout;
