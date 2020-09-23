import { options, Fragment } from 'preact';

/** @typedef {import('preact').VNode} VNode */

/**
 * @fileoverview
 * This file exports various methods that implement Babel's "automatic" JSX runtime API:
 * - jsx(type, props, key)
 * - jsxs(type, props, key)
 * - jsxDEV(type, props, key, __source, __self)
 *
 * The implementation of createVNode here is optimized for performance.
 * Benchmarks: https://esbench.com/bench/5f6b54a0b4632100a7dcd2b3
 */

/**
 * JSX.Element factory used by Babel's {runtime:"automatic"} JSX transform
 * @param {VNode['type']} type
 * @param {VNode['props']} props
 * @param {VNode['key']} [key]
 * @param {string} [__source]
 * @param {string} [__self]
 */
function createVNode(type, props, key, __source, __self) {
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

	// If a Component VNode, check for and apply defaultProps.
	// Note: `type` is often a String, and can be `undefined` in development.
	let defaults, i;
	if (typeof type === 'function' && (defaults = type.defaultProps)) {
		for (i in defaults) if (props[i] === undefined) props[i] = defaults[i];
	}

	if (options.vnode) options.vnode(vnode);
	return vnode;
}

export {
	createVNode as jsx,
	createVNode as jsxs,
	createVNode as jsxDEV,
	Fragment
};
