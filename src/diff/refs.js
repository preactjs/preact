import options from '../options';

/**
 * Invoke or update a ref, depending on whether it is a function or object ref.
 * @param {object|function} ref
 * @param {any} value
 * @param {import('../internal').Internal} internal
 */
export function applyRef(oldRef, ref, value, internal) {
	if (oldRef === ref) return;

	if (typeof oldRef == 'function') {
		try {
			oldRef(null);
		} catch (e) {
			options._catchError(e, internal);
		}
	} else if (oldRef) oldRef.current = null;

	if (typeof ref == 'function') {
		try {
			ref(value);
		} catch (e) {
			options._catchError(e, internal);
		}
	} else ref.current = value;
}
