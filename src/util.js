export const root = typeof window === 'undefined' ? global : window;

/** Copy own-properties from `props` onto `obj`.
 *	@returns obj
 *	@private
 */
export function extend(obj, props) {
	for (let i in props) obj[i] = props[i];
	return obj;
}


/** Coerces and returns a lowercased representation of the argument.
 *  @param {mixed} str
 */
export function lowercase (str) {
	return String(str).toLowerCase();
}
