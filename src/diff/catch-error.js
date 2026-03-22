import { NULL } from '../constants';
import { getMountedBacking } from '../backing';

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
		/** @type {boolean} */
		handled;

	// Walk the backing parent chain to find error boundaries.
	let backing = getMountedBacking(vnode);
	let cur = backing != NULL ? backing._parent : NULL;

	// Fallback: if no backing parent chain, try vnode._parent for vnodes
	// that haven't been fully mounted yet.
	if (cur == NULL && vnode._parent) {
		let parentBacking = getMountedBacking(vnode._parent);
		if (parentBacking != NULL) cur = parentBacking;
	}

	while (cur != NULL) {
		if ((component = cur._component) && !component._processingException) {
			try {
				ctor = component.constructor;

				if (ctor && ctor.getDerivedStateFromError != NULL) {
					component.setState(ctor.getDerivedStateFromError(error));
					handled = component._dirty;
				}

				if (component.componentDidCatch != NULL) {
					component.componentDidCatch(error, errorInfo || {});
					handled = component._dirty;
				}

				if (handled) {
					return (component._pendingError = component);
				}
			} catch (e) {
				error = e;
			}
		}

		cur = cur._parent;
	}

	throw error;
}
