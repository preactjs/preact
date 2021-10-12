import {
	DIRTY_BIT,
	MODE_RERENDERING_ERROR,
	MODE_PENDING_ERROR,
	TYPE_ERROR_BOUNDARY
} from '../constants';
import { handleErrorReact } from './reactComponents';

/**
 * Find the closest error boundary to a thrown error and call it
 * @param {object} error The thrown value
 * @param {import('../internal').Internal} internal The Internal node that threw
 * the error that was caught (except for unmounting when this parameter
 * is the highest parent that was being unmounted)
 */
export function _catchError(error, internal) {
	let handler = internal;
	// The following condition could also be the following if it is smaller:
	// (handler.flags & (TYPE_ERROR_BOUNDARY | MODE_RERENDERING_ERROR)) == TYPE_ERROR_BOUNDARY
	while ((handler = handler._parent)) {
		if (
			handler.flags & TYPE_ERROR_BOUNDARY &&
			~handler.flags & MODE_RERENDERING_ERROR
		) {
			try {
				handleErrorReact(handler, error, internal);

				if (handler.flags & DIRTY_BIT) {
					handler.flags |= MODE_PENDING_ERROR;
					return;
				}
			} catch (e) {
				error = e;
			}
		}
	}

	throw error;
}
