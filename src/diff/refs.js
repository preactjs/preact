import options from '../options';

/**
 * Invoke or update a ref, depending on whether it is a function or object ref.
 * @param {object|function} ref
 * @param {any} value
 * @param {import('../internal').Internal} internal
 */
export function applyRef(oldRef, ref, value, internal) {
	if (oldRef === ref) return;

	if (oldRef) applyRef(null, oldRef, null, internal);
	try {
		if (typeof ref == 'function') ref(value);
		else ref.current = value;
	} catch (e) {
		options._catchError(e, internal);
	}
}
