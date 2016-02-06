import { isFunction } from './util';

/** Invoke a "hook" method with arguments if it exists.
 *	@private
 */
export function hook(obj, name, ...args) {
	let fn = obj[name];
	if (fn && isFunction(fn)) return fn.apply(obj, args);
}



/** Invoke hook() on a component and child components (recursively)
 *	@private
 */
export function deepHook(obj, ...args) {
	do {
		hook(obj, ...args);
	} while ((obj=obj._component));
}
