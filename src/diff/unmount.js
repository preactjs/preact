import { MODE_UNMOUNTING, TYPE_DOM, TYPE_ROOT } from '../constants';
import { unsubscribeFromContext } from '../create-context';
import options from '../options';
import { applyRef } from './refs';
import { ENABLE_CLASSES } from '../component';

/**
 * Unmount a virtual node from the tree and apply DOM changes
 * @param {import('../internal').Internal} internal The virtual node to unmount
 * @param {import('../internal').Internal} topUnmountedInternal The top of the
 * subtree that is being unmounted
 * @param {number} [skipRemove] Flag that indicates that a parent node of the
 * current element is already detached from the DOM.
 */
export function unmount(internal, topUnmountedInternal, skipRemove) {
	let r,
		i = 0;
	if (options.unmount) options.unmount(internal);
	internal.flags |= MODE_UNMOUNTING;

	if ((r = internal.ref)) {
		applyRef(r, null, topUnmountedInternal);
	}

	if ((r = internal._component)) {
		unsubscribeFromContext(internal);

		if (ENABLE_CLASSES && r.componentWillUnmount) {
			try {
				r.componentWillUnmount();
			} catch (e) {
				options._catchError(e, topUnmountedInternal);
			}
		}
	}

	if ((r = internal._child)) {
		while (r) {
			unmount(
				r,
				topUnmountedInternal,
				skipRemove ? ~internal.flags & TYPE_ROOT : internal.flags & TYPE_DOM
			);
			r = r._next;
		}
	}

	if (!skipRemove && internal.flags & TYPE_DOM) {
		internal.data.remove();
		internal.data = null;
	}
}
