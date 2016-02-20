import options from './options';


/** Invoke a hook on the `options` export. */
export function optionsHook(name, a, b) {
	return hook(options, name, a, b);
}


/** Invoke a "hook" method with arguments if it exists.
 *	@private
 */
export function hook(obj, name, a, b, c) {
	let fn = obj[name];
	if (fn && fn.call) return fn.call(obj, a, b, c);
}


/** Invoke hook() on a component and child components (recursively)
 *	@private
 */
export function deepHook(obj, type) {
	do {
		hook(obj, type);
	} while ((obj=obj._component));
}
