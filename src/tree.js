import { UNDEFINED } from './constants';

export const TYPE_TEXT = 1 << 0;
export const TYPE_ELEMENT = 1 << 1;
export const TYPE_CLASS = 1 << 2;
export const TYPE_FUNCTION = 1 << 3;
export const MODE_SVG = 1 << 4;
export const MODE_MATH = 1 << 5;

export function createInternal(vnode) {
	let flags = 0,
		type = vnode.type;

	if (typeof vnode == 'string') {
		// type = null;
		flags |= TYPE_TEXT;
	}
	// Prevent JSON injection by rendering injected objects as empty Text nodes
	else if (vnode.constructor !== UNDEFINED) {
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
		}

		if (flags & TYPE_ELEMENT && type === 'math') {
			flags |= MODE_MATH;
		}

		// TODO: if parent has math or svg namespace, inherit it
	}

	return {
		flags,
		vnode
	};
}
