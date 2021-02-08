import {
	FUNCTION_NODE,
	ELEMENT_NODE,
	TEXT_NODE,
	CLASS_NODE,
	FRAGMENT_NODE,
	// COMPONENT_NODE,
	MODE_NONE
} from './constants';
import { Fragment } from './create-element';

/**
 * Create an internal tree node
 * @param {import('./internal').VNode | string} vnode
 * @returns {import('./internal').Internal}
 */
export function createInternal(vnode) {
	let type, props, key, ref;

	/** @type {import('./internal').InternalFlags} */
	let flags = TEXT_NODE;

	// Text VNodes/Internals use NaN as an ID so that two are never equal.
	let vnodeId = NaN;

	if (typeof vnode === 'string') {
		type = null;
		props = vnode;
	} else if (vnode.constructor === undefined) {
		type = vnode.type;
		props = vnode.props;
		vnodeId = vnode._original;

		if (props) {
			if ((key = props.key) != null) {
				props.key = undefined;
			}
			if (typeof type !== 'function' && (ref = props.ref) != null) {
				props.ref = undefined;
			}
		} else {
			props = {};
		}

		// flags = typeof type === 'function' ? COMPONENT_NODE : ELEMENT_NODE;
		flags =
			type === Fragment
				? FRAGMENT_NODE
				: typeof type === 'function'
				? type.prototype && 'render' in type.prototype
					? CLASS_NODE
					: FUNCTION_NODE
				: ELEMENT_NODE;
	}

	/** @type {import('./internal').Internal} */
	const internal = {
		type,
		props,
		key,
		ref,
		_children: null,
		_parent: null,
		_next: null,
		_original: vnodeId,
		_dom: null,
		_component: null,
		_flags: flags,
		_mode: MODE_NONE,
		_depth: 0
	};

	return internal;
}
