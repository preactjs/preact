import { NON_DIMENSION_PROPS } from './constants';


/** Copy own-properties from `props` onto `obj`.
 *	@returns obj
 *	@private
 */
export function extend(obj, props) {
	for (let i in props) if (hasOwnProperty.call(props, i)) {
		obj[i] = props[i];
	}
	return obj;
}


/** Create a caching wrapper for the given function.
 *	@private
 */
export function memoize(fn, mem) {
	mem = mem || {};
	return k => hasOwnProperty.call(mem, k) ? mem[k] : (mem[k] = fn(k));
}


/** Get a deep property value from the given object, expressed in dot-notation.
 *	@private
 */
export function delve(obj, key) {
	for (let p=key.split('.'), i=0; i<p.length && obj; i++) {
		obj = obj[p];
	}
	return obj;
}


/** Convert an Array-like object to an Array
 *	@private
 */
export function toArray(obj) {
	let arr = [],
		i = obj.length;
	while (i--) arr[i] = obj[i];
	return arr;
}


/** @private is the given object a Function? */
export const isFunction = obj => 'function'===typeof obj;


/** @private is the given object a String? */
export const isString = obj => 'string'===typeof obj;


/** @private Safe reference to builtin hasOwnProperty */
export const hasOwnProperty = Object.prototype.hasOwnProperty;


/** Check if a value is `null` or `undefined`.
 *	@private
 */
export const empty = x => (x===null || x===undefined);


/** Convert a hashmap of styles to CSSText
 *	@private
 */
export function styleObjToCss(s) {
	let str = '';
	for (let prop in s) {
		if (hasOwnProperty.call(s, prop)) {
			let val = s[prop];
			str += jsToCss(prop);
			str += ': ';
			str += val;
			if (typeof val==='number' && !NON_DIMENSION_PROPS[prop]) {
				str += 'px';
			}
			str += '; ';
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
export const jsToCss = memoize( s => s.replace(/([A-Z])/,'-$1').toLowerCase() );
