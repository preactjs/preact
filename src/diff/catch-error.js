import { DIRTY_BIT, MODE_ERRORED } from '../constants';

/**
 * Find the closest error boundary to a thrown error and call it
 * @param {object} error The thrown value
 * @param {import('../internal').Internal} internal The Internal node that threw
 * the error that was caught (except for unmounting when this parameter
 * is the highest parent that was being unmounted)
 */
export function _catchError(error, internal) {
	/** @type {import('../internal').Component} */
	let component;

	internal._flags |= MODE_ERRORED;

	for (; (internal = internal._parent); ) {
		if ((component = internal._component) && ~internal._flags & MODE_ERRORED) {
			try {
				if (internal.type.getDerivedStateFromError != null) {
					component.setState(internal.type.getDerivedStateFromError(error));
				}

				if (component.componentDidCatch != null) {
					component.componentDidCatch(error);
				}

				// NOTE: We're checking that any component in the stack got marked as dirty, even if it did so prior to this loop,
				// which is technically incorrect. However, there is no way for a component to mark itself as dirty during rendering.
				// The only way for a component to falsely intercept error bubbling would be to manually sets its internal dirty flag.
				if (internal._flags & DIRTY_BIT) {
					return;
				}
			} catch (e) {
				error = e;
			}
		}
	}

	throw error;
}
