import { options, Fragment } from 'preact';
import { encodeEntities } from './encode';

/** @typedef {import('preact').VNode} VNode */

let vnodeId = 0;

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
 * @param {unknown} [isStaticChildren]
 * @param {unknown} [__source]
 * @param {unknown} [__self]
 */
function createVNode(type, props, key, isStaticChildren, __source, __self) {
	// We'll want to preserve `ref` in props to get rid of the need for
	// forwardRef components in the future, but that should happen via
	// a separate PR.
	let normalizedProps = {},
		ref,
		i;
	for (i in props) {
		if (i == 'ref') {
			ref = props[i];
		} else {
			normalizedProps[i] = props[i];
		}
	}

	const vnode = {
		type,
		props: normalizedProps,
		key,
		ref,
		_children: null,
		_parent: null,
		_depth: 0,
		_dom: null,
		_nextDom: undefined,
		_component: null,
		_hydrating: null,
		constructor: undefined,
		_original: --vnodeId,
		_index: -1,
		__source,
		__self
	};

	// If a Component VNode, check for and apply defaultProps.
	// Note: `type` is often a String, and can be `undefined` in development.
	if (typeof type === 'function' && (ref = type.defaultProps)) {
		for (i in ref)
			if (typeof normalizedProps[i] === 'undefined') {
				normalizedProps[i] = ref[i];
			}
	}

	if (options.vnode) options.vnode(vnode);
	return vnode;
}

/**
 * @param {string[]} templates
 * @param  {Array<string | null | VNode>} exprs
 * @returns {VNode}
 */
function jsxssr(templates, ...exprs) {
	const vnode = createVNode(Fragment, { tpl: templates, exprs });
	// Bypass render to string top level Fragment optimization
	vnode.key = vnode._vnode;
	return vnode;
}

/**
 * Serialize an attribute to HTML
 * @param {string} name Attribute name
 * @param {*} value
 * @returns {string}
 */
function jsxattr(name, value) {
	if (name === 'ref' || name === 'key') return '';

	if (
		value == null ||
		value === false ||
		typeof value === 'function' ||
		typeof value === 'object'
	) {
		return '';
	} else if (value === true) return name;

	return name + '="' + encodeEntities(value) + '"';
}

export {
	createVNode as jsx,
	createVNode as jsxs,
	createVNode as jsxDEV,
	Fragment,
	// precompiled JSX transform
	jsxattr,
	jsxssr
};
