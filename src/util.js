/** Copy own-properties from `props` onto `obj`.
 *	@returns obj
 *	@private
 */
export function extend(obj, props) {
	for (let i in props) obj[i] = props[i];
	return obj;
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


/** @private is the given object a Function? */
export function isFunction(obj) {
	return 'function'===typeof obj;
}


/** @private is the given object a String? */
export function isString(obj) {
	return 'string'===typeof obj;
}




/** Just a memoized String#toLowerCase */
let lcCache = {};
export const toLowerCase = s => lcCache[s] || (lcCache[s] = s.toLowerCase());


