/** Copy own-properties from `props` onto `obj`.
 *	@returns obj
 *	@private
 */
export function extend(obj, props) {
	for (let i in props) obj[i] = props[i];
	return obj;
}

/** Call a function asynchronously, as soon as possible.
 *	@param {Function} callback
 */
let promise;
export const defer = (promise = typeof Promise === 'function' ? Promise.resolve() : undefined) ? promise.then.bind(promise) : setTimeout;
