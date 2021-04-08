import {
	MODE_HYDRATE,
	MODE_SUSPENDED,
	MODE_SUSPENDED_HYDRATION,
	MODE_UNMOUNTING,
	TYPE_DOM,
	TYPE_ROOT
} from '../constants';
import options from '../options';
import { removeNode } from '../util';
import { applyRef } from './refs';

/**
 * Unmount a virtual node from the tree and apply DOM changes
 * @param {import('../internal').Internal} internal The virtual node to unmount
 * @param {import('../internal').Internal} parentInternal The parent of the VNode that
 * initiated the unmount
 * @param {boolean} [skipRemove] Flag that indicates that a parent node of the
 * current element is already detached from the DOM.
 */
export function unmount(internal, parentInternal, skipRemove) {
	let r;
	if (options.unmount) options.unmount(internal);
	internal._flags |= MODE_UNMOUNTING;

	if ((r = internal.ref)) {
		// TODO: Why check for current == _dom
		if (!r.current || r.current === internal._component)
			applyRef(r, null, parentInternal);
	}

	let dom;
	if (!skipRemove && internal._flags & TYPE_DOM) {
		skipRemove = (dom = internal._component) != null;
	} else if (
		!skipRemove &&
		(internal._flags & MODE_SUSPENDED_HYDRATION) === MODE_SUSPENDED_HYDRATION
	) {
		skipRemove = (dom = internal._parkedDom) != null;
	} else if (internal._flags & TYPE_ROOT) {
		skipRemove = false;
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

	internal._component = null;

	if ((r = internal._children)) {
		for (let i = 0; i < r.length; i++) {
			if (r[i]) unmount(r[i], parentInternal, skipRemove);
		}
	}

	if (dom != null) removeNode(dom);
}
