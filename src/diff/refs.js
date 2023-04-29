import { errorHook } from '../options';

/**
 * Invoke or update a ref, depending on whether it is a function or object ref.
 * @param {object|function} ref
 * @param {any} value
 * @param {import('../internal').Internal} internal
 */
export function applyRef(ref, value, internal) {
	try {
		if (typeof ref == 'function') ref(value);
		else if (ref) ref.current = value;
	} catch (e) {
		errorHook(e, internal);
	}
}
