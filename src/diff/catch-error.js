// import { enqueueRender } from '../component';

/**
 * Find the closest error boundary to a thrown error and call it
 * @param {object} error The thrown value
 * @param {import('../internal').VNode} vnode The vnode that threw
 * the error that was caught (except for unmounting when this parameter
 * is the highest parent that was being unmounted)
 */
export function _catchError(error, vnode) {
	/** @type {import('../internal').Component} */
	let component, hasCaught;
	const wasHydrating = vnode._hydrating;

	for (; (vnode = vnode._parent); ) {
		if ((component = vnode._component) && !component._processingException) {
			try {
				if (
					component.constructor &&
					component.constructor.getDerivedStateFromError != null
				) {
					hasCaught = true;
					component.setState(
						component.constructor.getDerivedStateFromError(error)
					);
				}

				if (component.componentDidCatch != null) {
					hasCaught = true;
					component.componentDidCatch(error);
				}

				if (hasCaught) {
					// This is an error boundary. Mark it as having bailed out, and whether it was mid-hydration.
					vnode._hydrating = wasHydrating;
					component._pendingError = component;
					return;
				}
			} catch (e) {
				error = e;
			}
		}
	}

	throw error;
}
