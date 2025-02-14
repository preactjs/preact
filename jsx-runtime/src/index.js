import { options, Fragment } from 'preact';
import { encodeEntities } from './utils';

let vnodeId = 0;

const isArray = Array.isArray;

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
 * @param {import('../../src/internal').VNode['type']} type
 * @param {import('preact').VNode['props']} props
 * @param {import('preact').VNode['key']} [key]
 * @param {unknown} [isStaticChildren]
 * @param {unknown} [__source]
 * @param {unknown} [__self]
 */
function createVNode(type, props, key, isStaticChildren, __source, __self) {
	if (!props) props = {};
	// We'll want to preserve `ref` in props to get rid of the need for
	// forwardRef components in the future, but that should happen via
	// a separate PR.
	let normalizedProps = props,
		ref,
		i;

	if ('ref' in normalizedProps && typeof type != 'function') {
		normalizedProps = {};
		for (i in props) {
			if (i == 'ref') {
				ref = props[i];
			} else {
				normalizedProps[i] = props[i];
			}
		}
	}

	return typeof type === 'function'
		? createComponentVNode(type, normalizedProps, key, __source, __self)
		: createDomVNode(type, normalizedProps, key, ref, __source, __self);
}

/**
 * Create a VNode (used internally by Preact)
 * @param {import('../../src/internal').VNode["type"]} type The node name or Component
 * Constructor for this virtual node
 * @param {object | string | number | null} props The properties of this virtual node.
 * If this virtual node represents a text node, this is the text of the node (string or number).
 * @param {string | number | null} key The key for this virtual node, used when
 * diffing it against its children
 * @returns {import('../../src/internal').VNode}
 */
export function createComponentVNode(type, props, key, __source, __self) {
	// V8 seems to be better at detecting type shapes if the object is allocated from the same call site
	// Do not inline into createElement and coerceToVNode!
	/** @type {import('../../src/internal').VNode} */
	const vnode = {
		type,
		props,
		key,
		_children: null,
		_parent: null,
		_depth: 0,
		_dom: null,
		_component: null,
		constructor: undefined,
		_original: --vnodeId,
		_index: -1,
		_flags: 0,
		__source,
		__self
	};

	// Only invoke the vnode hook if this was *not* a direct copy:
	if (options.vnode != null) options.vnode(vnode);

	return vnode;
}

/**
 * Create a VNode (used internally by Preact)
 * @param {import('../../src/internal').VNode["type"]} type The node name or Component
 * Constructor for this virtual node
 * @param {object | string | number | null} props The properties of this virtual node.
 * If this virtual node represents a text node, this is the text of the node (string or number).
 * @param {string | number | null} key The key for this virtual node, used when
 * diffing it against its children
 * @param {import('../../src/internal').VNode["ref"]} ref The ref property that will
 * receive a reference to its created child
 * @returns {import('../../src/internal').VNode}
 */
export function createDomVNode(type, props, key, ref, __source, __self) {
	// V8 seems to be better at detecting type shapes if the object is allocated from the same call site
	// Do not inline into createElement and coerceToVNode!
	/** @type {import('../../src/internal').VNode} */
	const vnode = {
		type,
		props,
		key,
		ref,
		_children: null,
		_parent: null,
		_depth: 0,
		_dom: null,
		constructor: undefined,
		_index: -1,
		__source,
		__self
	};

	// Only invoke the vnode hook if this was *not* a direct copy:
	if (options.vnode != null) options.vnode(vnode);

	return vnode;
}

/**
 * Create a template vnode. This function is not expected to be
 * used directly, but rather through a precompile JSX transform
 * @param {string[]} templates
 * @param  {Array<string | null | import('preact').VNode>} exprs
 * @returns {import('preact').VNode}
 */
function jsxTemplate(templates, ...exprs) {
	const vnode = createVNode(Fragment, { tpl: templates, exprs });
	// Bypass render to string top level Fragment optimization
	// @ts-ignore
	vnode.key = vnode._vnode;
	return vnode;
}

const JS_TO_CSS = {};
const CSS_REGEX = /[A-Z]/g;

/**
 * Serialize an HTML attribute to a string. This function is not
 * expected to be used directly, but rather through a precompile
 * JSX transform
 * @param {string} name The attribute name
 * @param {*} value The attribute value
 * @returns {string}
 */
function jsxAttr(name, value) {
	if (options.attr) {
		const result = options.attr(name, value);
		if (typeof result === 'string') return result;
	}

	if (name === 'ref' || name === 'key') return '';
	if (name === 'style' && typeof value === 'object') {
		let str = '';
		for (let prop in value) {
			let val = value[prop];
			if (val != null && val !== '') {
				const name =
					prop[0] == '-'
						? prop
						: JS_TO_CSS[prop] ||
							(JS_TO_CSS[prop] = prop.replace(CSS_REGEX, '-$&').toLowerCase());

				str = str + name + ':' + val + ';';
			}
		}
		return name + '="' + str + '"';
	}

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

/**
 * Escape a dynamic child passed to `jsxTemplate`. This function
 * is not expected to be used directly, but rather through a
 * precompile JSX transform
 * @param {*} value
 * @returns {string | null | import('preact').VNode | Array<string | null | import('preact').VNode>}
 */
function jsxEscape(value) {
	if (
		value == null ||
		typeof value === 'boolean' ||
		typeof value === 'function'
	) {
		return null;
	}

	if (typeof value === 'object') {
		// Check for VNode
		if (value.constructor === undefined) return value;

		if (isArray(value)) {
			for (let i = 0; i < value.length; i++) {
				value[i] = jsxEscape(value[i]);
			}
			return value;
		}
	}

	return encodeEntities('' + value);
}

export {
	createVNode as jsx,
	createVNode as jsxs,
	createVNode as jsxDEV,
	Fragment,
	// precompiled JSX transform
	jsxTemplate,
	jsxAttr,
	jsxEscape
};
