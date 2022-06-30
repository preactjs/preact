import { MODE_UNMOUNTING, TYPE_DOM, TYPE_ROOT } from '../constants';
import { unsubscribeFromContext } from '../create-context';
import options from '../options';
import { applyRef } from './refs';
import { ENABLE_CLASSES } from '../component';

/**
 * Unmount a virtual node from the tree and apply DOM changes
 * @param {import('../internal').Internal} internal The virtual node to unmount
 * @param {import('../internal').Internal} parentInternal The parent of the VNode that
 * initiated the unmount
 * @param {number} [skipRemove] Flag that indicates that a parent node of the
 * current element is already detached from the DOM.
 */
export function unmount(internal, parentInternal, skipRemove) {
	let r,
		i = 0;
	if (options.unmount) options.unmount(internal);
	internal.flags |= MODE_UNMOUNTING;

	if ((r = internal.ref)) {
		applyRef(r, null, parentInternal);
	}

	if ((r = internal._component)) {
		unsubscribeFromContext(internal);

		if (ENABLE_CLASSES && r.componentWillUnmount) {
			try {
				r.componentWillUnmount();
			} catch (e) {
				options._catchError(e, parentInternal);
			}
		}
	}

	if ((r = internal._children)) {
		for (; i < r.length; i++) {
			if (r[i]) {
				unmount(
					r[i],
					parentInternal,
					skipRemove ? ~internal.flags & TYPE_ROOT : internal.flags & TYPE_DOM
				);
			}
		}
	}

	if (!skipRemove && internal.flags & TYPE_DOM) {
		internal._dom.remove();
	}

	internal._dom = null;
}
