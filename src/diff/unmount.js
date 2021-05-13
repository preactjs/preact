import { MODE_UNMOUNTING, TYPE_DOM, TYPE_ROOT } from '../constants';
import options from '../options';
import { removeNode } from '../util';
import { applyRef } from './refs';

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
	internal._flags |= MODE_UNMOUNTING;

	if ((r = internal.ref)) {
		if (!r.current || r.current === internal._dom)
			applyRef(r, null, parentInternal);
	}

	if ((r = internal._component) != null) {
		if (r.componentWillUnmount) {
			try {
				r.componentWillUnmount();
			} catch (e) {
				options._catchError(e, parentInternal);
			}
		}
	}

	if ((r = internal._children)) {
		for (let node of r) {
			if (node) {
				unmount(
					r[i],
					parentInternal,
					skipRemove ? ~internal._flags & TYPE_ROOT : internal._flags & TYPE_DOM
				);
      }
		}
	}

	if (!skipRemove && internal._flags & TYPE_DOM) {
		removeNode(internal._dom);
	}

	internal._dom = null;
}
