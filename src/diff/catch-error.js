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

	// Walk the parent chain to find error boundaries.
	// Try backing._parent first (authoritative). Fall back to vnode._parent
	// for vnodes that don't have a backing yet (error thrown during first diff
	// before setOwnedChildren runs).
	let backing = getMountedBacking(vnode);
	let cur = backing != NULL ? backing._parent : NULL;
	let curVNode = cur != NULL ? cur._vnode : vnode._parent || NULL;

	while (curVNode != NULL) {
		if ((component = curVNode._component) && !component._processingException) {
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

		// Move to next parent
		if (cur != NULL) {
			cur = cur._parent;
			curVNode = cur != NULL ? cur._vnode : NULL;
		} else {
			// No backing parent — fall back to vnode._parent
			curVNode = curVNode._parent || NULL;
		}
	}

	throw error;
}
