import { NULL } from '../constants';

/**
 * Find the closest error boundary to a thrown error and call it.
 * Walks backing._parent to find componentDidCatch/getDerivedStateFromError.
 *
 * @param {object} error The thrown value
 * @param {import('../internal').VNode} vnode The vnode that threw
 * @param {import('../internal').VNode} [oldVNode]
 * @param {import('../internal').ErrorInfo} [errorInfo]
 * @param {import('../internal').BackingNode} [backing] The backing node for the throwing vnode
 */
export function _catchError(error, vnode, oldVNode, errorInfo, backing) {
	/** @type {import('../internal').Component} */
	let component,
		/** @type {import('../internal').ComponentType} */
		ctor,
		/** @type {boolean} */
		handled;

	// Walk the backing parent chain to find error boundaries.
	let cur = backing != NULL ? backing._parent : NULL;

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
