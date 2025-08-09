import { resetRenderCount } from '../component';
import {
	NULL,
	COMPONENT_DIRTY,
	COMPONENT_PENDING_ERROR,
	COMPONENT_PROCESSING_EXCEPTION,
	COMPONENT_FORCE
} from '../constants';

/**
 * Find the closest error boundary to a thrown error and call it
 * @param {object} error The thrown value
 * @param {import('../internal').VNode} vnode The vnode that threw the error that was caught (except
 * for unmounting when this parameter is the highest parent that was being
 * unmounted)
 * @param {import('../internal').VNode} [oldVNode]
 * @param {import('../internal').ErrorInfo} [errorInfo]
 */
export function _catchError(error, vnode, oldVNode, errorInfo) {
	/** @type {import('../internal').Component} */
	let component,
		/** @type {import('../internal').ComponentType} */
		ctor,
		/** @type {number} */
		handled;

	for (; (vnode = vnode._parent); ) {
		if (
			(component = vnode._component) &&
			!(component._bits & COMPONENT_PROCESSING_EXCEPTION)
		) {
			component._bits |= COMPONENT_FORCE;
			try {
				ctor = component.constructor;

				if (ctor && ctor.getDerivedStateFromError != NULL) {
					component.setState(ctor.getDerivedStateFromError(error));
					handled = component._bits & COMPONENT_DIRTY;
				}

				if (component.componentDidCatch != NULL) {
					component.componentDidCatch(error, errorInfo || {});
					handled = component._bits & COMPONENT_DIRTY;
				}

				// This is an error boundary. Mark it as having bailed out, and whether it was mid-hydration.
				if (handled) {
					component._bits |= COMPONENT_PENDING_ERROR;
					return;
				}
			} catch (e) {
				error = e;
			}
		}
	}

	// Reset rerender count to 0, so that the next render will not be skipped
	// when we leverage prefresh
	resetRenderCount();
	throw error;
}
