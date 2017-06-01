/** Copy own-properties from `props` onto `obj`.
 *	@returns obj
 *	@private
 */
export function extend(obj, props) {
	Object.keys(props).forEach(key => obj[key] = props[key]);
	return obj;
}
