import { options, Fragment } from 'preact';

/** @typedef {import('preact').VNode} VNode */

/**
 * jsx(type, props, key)
 * jsxs(type, props, key)
 * jsxDEV(type, props, key, __source, __self)
 * @param {VNode['type']} type
 * @param {VNode['props']} props
 * @param {VNode['key']} [key]
 * @param {string} [__source]
 * @param {string} [__self]
 * @param {string} [_i]
 * @param {*} [_x]
 */
function createVNode(type, props, key, __source, __self, _i, _x) {
	// If a Component VNode, check for and apply defaultProps
	// Note: type may be undefined in development, must never error here.
	if ((_x = type && type.defaultProps)) {
		for (_i in _x) if (props[_i] === undefined) props[_i] = _x[_i];
	}

	const vnode = {
		type,
		props,
		key,
		ref: props && props.ref,
		_children: null,
		_parent: null,
		_depth: 0,
		_dom: null,
		_nextDom: undefined,
		_component: null,
		_hydrating: null,
		constructor: undefined,
		_original: undefined,
		__source,
		__self
	};
	vnode._original = vnode;
	if (options.vnode != null) options.vnode(vnode);
	return vnode;
}

export {
	createVNode as jsx,
	createVNode as jsxs,
	createVNode as jsxDEV,
	Fragment
};
