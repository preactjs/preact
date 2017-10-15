/** 
 *  Copy own-properties from `props` onto `obj`.
 *  
 *  @param {Object} obj the object to which the properties
 *  are to be copied to
 *
 *  @param {Object} props the object from which the properties
 *  are to be copied from
 *
 *	@returns obj
 *	@private
 */
export function extend(obj, props) {
	for (let i in props) obj[i] = props[i];
	return obj;
}

/** 
 * Call a function asynchronously, as soon as possible. Makes
 * use of HTML Promise to schedule the callback, if available,
 * or else use the `setTimeout` browser functionality. All latest
 * browsers support `Promise` except Internet Explorer which is
 * now replaced by Edge.
 * 
 * @param {Function} callback
 */
export const defer = typeof Promise=='function' ? Promise.resolve().then.bind(Promise.resolve()) : setTimeout;
