import { UNDEFINED } from './constants';

export const TYPE_TEXT = 1 << 0;
export const TYPE_ELEMENT = 1 << 1;
export const TYPE_CLASS = 1 << 2;
export const TYPE_FUNCTION = 1 << 3;
export const TYPE_INVALID = 1 << 6;
export const TYPE_COMPONENT = TYPE_CLASS | TYPE_FUNCTION;

export const MODE_SVG = 1 << 4;
export const MODE_MATH = 1 << 5;
const INHERITED_MODES = MODE_MATH | MODE_SVG;

/**
 *
 * @param {import('./internal').VNode} vnode
 * @param {import('./internal').Internal | null} parentInternal
 * @returns {import('./internal').Internal}
 */
export function createInternal(vnode, parentInternal) {
	let flags = parentInternal ? parentInternal.flags & INHERITED_MODES : 0,
		type = vnode.type;

	if (vnode.constructor !== UNDEFINED) {
		flags |= TYPE_INVALID;
	} else if (typeof vnode == 'string' || type == null) {
		// type = null;
		flags |= TYPE_TEXT;
	} else {
		// flags = typeof type === 'function' ? COMPONENT_NODE : ELEMENT_NODE;
		flags |=
			typeof type == 'function'
				? type.prototype && type.prototype.render
					? TYPE_CLASS
					: TYPE_FUNCTION
				: TYPE_ELEMENT;

		if (flags & TYPE_ELEMENT && type === 'svg') {
			flags |= MODE_SVG;
		} else if (
			parentInternal &&
			parentInternal.flags & MODE_SVG &&
			parentInternal.type === 'foreignObject'
		) {
			flags &= ~MODE_SVG;
		} else if (flags & TYPE_ELEMENT && type === 'math') {
			flags |= MODE_MATH;
		}
	}

	return {
		type,
		props: vnode.props,
		key: vnode.key,
		ref: vnode.ref,
		data:
			flags & TYPE_COMPONENT
				? { _commitCallbacks: [], _context: null, _stateCallbacks: [] }
				: null,
		flags,
		// @ts-expect-error
		vnode,
		// TODO: rerender
		_children: null,
		_parent: parentInternal,
		_vnodeId: vnode._original,
		_component: null,
		_depth: parentInternal ? parentInternal._depth + 1 : 0
	};
}
