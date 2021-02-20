import options from './options';
import {
	TYPE_FUNCTION,
	TYPE_ELEMENT,
	TYPE_TEXT,
	TYPE_CLASS,
	TYPE_FRAGMENT,
	INHERITED_MODES
} from './constants';
import { Fragment } from './create-element';

/**
 * Create an internal tree node
 * @param {import('./internal').VNode | string} vnode
 * @param {import('./internal').Internal} [parentInternal]
 * @returns {import('./internal').Internal}
 */
export function createInternal(vnode, parentInternal) {
	let type = null,
		props,
		key,
		ref;

	/** @type {import('./internal').InternalTypeFlags} */
	let flags = TYPE_TEXT;

	// Text VNodes/Internals use NaN as an ID so that two are never equal.
	let vnodeId = NaN;

	if (typeof vnode === 'string') {
		// type = null;
		props = vnode;
	} else if (vnode.constructor !== undefined) {
		props = '';
	} else {
		type = vnode.type;
		props = vnode.props;
		key = vnode.key;
		ref = vnode.ref;
		vnodeId = vnode._vnodeId;

		// @TODO re-enable this when we stop removing key+ref from VNode props
		if (props) {
			// if ((key = props.key) != null) {
			// 	props.key = undefined;
			// }
			// if (typeof type !== 'function' && (ref = props.ref) != null) {
			// 	props.ref = undefined;
			// }
		} else {
			props = {};
		}

		// flags = typeof type === 'function' ? COMPONENT_NODE : ELEMENT_NODE;
		flags =
			type === Fragment
				? TYPE_FRAGMENT
				: typeof type === 'function'
				? type.prototype && 'render' in type.prototype
					? TYPE_CLASS
					: TYPE_FUNCTION
				: TYPE_ELEMENT;
	}

	// /** @type {import('./internal').Internal} */
	// const internal = {
	// 	type,
	// 	props,
	// 	key,
	// 	ref,
	// 	_children: null,
	// 	_parent: parentInternal,
	// 	_vnodeId: vnodeId,
	// 	_dom: null,
	// 	_component: null,
	// 	_flags: flags,
	// 	_mode: parentInternal ? parentInternal._mode : MODE_NONE,
	// 	_depth: parentInternal ? parentInternal._depth + 1 : 0
	// };
	const internal = new Internal(
		type,
		props,
		key,
		ref,
		parentInternal,
		vnodeId,
		flags
	);

	if (options._internal) options._internal(internal, vnode);

	return internal;
}

function Internal(type, props, key, ref, parentInternal, vnodeId, flags) {
	this.type = type;
	this.props = props;
	this.key = key;
	this.ref = ref;
	this._children = null;
	this._parent = parentInternal;
	this._vnodeId = vnodeId;
	this._dom = null;
	this._component = null;
	this._flags =
		flags | (parentInternal ? parentInternal._flags & INHERITED_MODES : 0);
	this._depth = parentInternal ? parentInternal._depth + 1 : 0;
}
