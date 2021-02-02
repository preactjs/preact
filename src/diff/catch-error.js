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
	let component, ctor;

	for (; (vnode = vnode._parent); ) {
		if ((component = vnode._component) && component._mode !== MODE_ERRORED) {
			try {
				ctor = component.constructor;

				if (ctor && ctor.getDerivedStateFromError != null) {
					component.setState(ctor.getDerivedStateFromError(error));
				}

				if (component.componentDidCatch != null) {
					component.componentDidCatch(error);
				}

				// This is an error boundary. Mark it as having bailed out, and whether it was mid-hydration.
				if (component._dirty) {
					component._mode = MODE_ERRORED;
					return;
				}
			} catch (e) {
				error = e;
			}
		}
	}

	throw error;
}
