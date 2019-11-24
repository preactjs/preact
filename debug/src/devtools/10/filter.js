import { Fragment } from 'preact';
import { getDisplayName } from './vnode';

/**
 *
 * @param {import('../../internal').VNode} vnode
 * @param {import('./types').FilterState} filters
 * @returns {boolean}
 */
export function shouldFilter(vnode, filters) {
	// Filter text nodes by default. They are too tricky to match
	// with the previous one...
	if (vnode.type == null) return true;

	if (typeof vnode.type === 'function') {
		if (vnode.type === Fragment && filters.type.has('fragment')) {
			const parent = vnode._parent;
			// Only filter non-root nodes
			if (parent != null) return true;

			return false;
		}
	} else if (
		(typeof vnode.type === 'string' || vnode.type === null) &&
		filters.type.has('dom')
	) {
		return true;
	}

	if (filters.regex.length > 0) {
		const name = getDisplayName(vnode);
		return filters.regex.some(r => r.test(name));
	}

	return false;
}
