import {
	TYPE_FUNCTION,
	TYPE_ELEMENT,
	TYPE_TEXT,
	TYPE_CLASS,
	TYPE_ROOT,
	TYPE_COMPONENT,
	MODE_SVG,
	UNDEFINED
} from './constants';
import { enqueueRenderInternal } from './component';

/**
 * Create an internal tree node
 * @param {VNode | string} vnode
 * @param {Internal} [parentInternal]
 * @returns {Internal}
 */
export function createInternal(vnode, parentInternal) {
	let type = null,
		props,
		key,
		ref;

	/** @type {number} */
	let flags = parentInternal ? parentInternal.flags : 0;

	// Text VNodes/Internals have an ID of 0 that is never used:
	let vnodeId = 0;

	if (typeof vnode == 'string') {
		// type = null;
		flags |= TYPE_TEXT;
		props = vnode;
	}
	// Prevent JSON injection by rendering injected objects as empty Text nodes
	else if (vnode.constructor !== UNDEFINED) {
		flags |= TYPE_TEXT;
		props = '';
	} else {
		type = vnode.type;
		props = vnode.props;
		key = vnode.key;
		ref = vnode.ref;
		vnodeId = vnode._original;

		flags |=
			typeof type == 'function'
				? type.prototype && type.prototype.render
					? TYPE_CLASS
					: props._parentDom
						? TYPE_ROOT
						: TYPE_FUNCTION
				: TYPE_ELEMENT;

		// TODO: add math mode
		if (flags & TYPE_ELEMENT && type === 'svg') {
			flags |= MODE_SVG;
		} else if (
			parentInternal &&
			parentInternal.flags & MODE_SVG &&
			parentInternal.type === 'foreignObject'
		) {
			flags &= ~MODE_SVG;
		}
	}

	/** @type {Internal} */
	const internal = {
		type,
		props,
		key,
		ref,
		data:
			flags & TYPE_COMPONENT
				? { _commitCallbacks: [], _context: null, _stateCallbacks: [] }
				: null,
		rerender: enqueueRenderInternal,
		flags,
		_children: null,
		_parent: parentInternal,
		_vnodeId: vnodeId,
		_component: null,
		_depth: parentInternal ? parentInternal._depth + 1 : 0
	};

	return internal;
}
