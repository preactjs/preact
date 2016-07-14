import options from './options';


/** Invoke a hook on the `options` export. */
export function optionsHook(name, a) {
	return hook(options, name, a);
}


/** Invoke a "hook" method with arguments if it exists.
 *	@private
 */
export function hook(obj, name, a, b, c) {
	if (obj[name]) return obj[name](a, b, c);
}
