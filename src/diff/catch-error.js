import {
	DIRTY_BIT,
	MODE_RERENDERING_ERROR,
	MODE_PENDING_ERROR,
	TYPE_COMPONENT
} from '../constants';

/**
 * Find the closest error boundary to a thrown error and call it
 * @param {object} error The thrown value
 * @param {import('../internal').Internal} internal The Internal node that threw
 * the error that was caught (except for unmounting when this parameter
 * is the highest parent that was being unmounted)
 */
export function _catchError(error, internal) {
	while ((internal = internal.parent)) {
		if (
			internal.flags & TYPE_COMPONENT &&
			~internal.flags & MODE_RERENDERING_ERROR
		) {
			try {
				if (internal.type.getDerivedStateFromError) {
					internal.component.setState(
						internal.type.getDerivedStateFromError(error)
					);
				}

				if (internal.component.componentDidCatch) {
					internal.component.componentDidCatch(error);
				}

				// NOTE: We're checking that any component in the stack got marked as dirty, even if it did so prior to this loop,
				// which is technically incorrect. However, there is no way for a component to mark itself as dirty during rendering.
				// The only way for a component to falsely intercept error bubbling would be to manually sets its internal dirty flag.
				if (internal.flags & DIRTY_BIT) {
					internal.flags |= MODE_PENDING_ERROR;
					return;
				}
			} catch (e) {
				error = e;
			}
		}
	}

	throw error;
}
