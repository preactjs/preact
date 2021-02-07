import { MODE_ERRORED } from '../constants';

/**
 * Find the closest error boundary to a thrown error and call it
 * @param {object} error The thrown value
 * @param {import('../internal').VNode} vnode The vnode that threw
 * the error that was caught (except for unmounting when this parameter
 * is the highest parent that was being unmounted)
 */
export function _catchError(error, vnode) {
	/** @type {import('../internal').Component} */
	let component;

	if (vnode) vnode._mode |= MODE_ERRORED;

	for (; (vnode = vnode._parent); ) {
		if ((component = vnode._component) && ~vnode._mode & MODE_ERRORED) {
			try {
				if (vnode.type.getDerivedStateFromError != null) {
					component.setState(vnode.type.getDerivedStateFromError(error));
				}

				if (component.componentDidCatch != null) {
					component.componentDidCatch(error);
				}

				// NOTE: We're checking that any component in the stack got marked as dirty, even if it did so prior to this loop,
				// which is technically incorrect. However, there is no way for a component to mark itself as dirty during rendering.
				// The only way for a component to falsely intercept error bubbling would be to manually sets its internal dirty flag.
				if (component._dirty) {
					return;
				}
			} catch (e) {
				error = e;
			}
		}
	}

	throw error;
}
