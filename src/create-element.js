import { UNDEFINED } from './constants';
import options from './options';

let vnodeId = 0;

/**
 * Create an virtual node (used for JSX)
 * @param {import('./internal').VNode["type"]} type The node name or Component
 * constructor for this virtual node
 * @param {object | null | undefined} [props] The properties of the virtual node
 * @param {Array<import('.').ComponentChildren>} [children] The children of the virtual node
 * @returns {import('./internal').VNode}
 */
export function createElement(type, props, children) {
	let normalizedProps = {},
		key,
		ref,
		i;
	for (i in props) {
		if (!(i === 'key' || (typeof type !== 'function' && i === 'ref')))
			normalizedProps[i] = props[i];
		else if (i === 'ref') {
			ref = props[i];
		} else if (i === 'key') {
			key = props[i];
		}
	}

	if (arguments.length > 3) {
		children = [children];
		// https://github.com/preactjs/preact/issues/1916
		for (i = 3; i < arguments.length; i++) {
			children.push(arguments[i]);
		}
	}

	if (arguments.length > 2) {
		normalizedProps.children = children;
	}

	// If a Component VNode, check for and apply defaultProps
	// Note: type may be undefined in development, must never error here.
	if (typeof type == 'function' && type.defaultProps != null) {
		for (i in type.defaultProps) {
			if (normalizedProps[i] === UNDEFINED) {
				normalizedProps[i] = type.defaultProps[i];
			}
		}
	}

	return createVNode(type, normalizedProps, key, ref, 0);
}

/**
 * Create a VNode (used internally by Preact)
 * @param {import('./internal').VNode["type"]} type The node name or Component
 * Constructor for this virtual node
 * @param {object | string | number | null} props The properties of this virtual node.
 * If this virtual node represents a text node, this is the text of the node (string or number).
 * @param {string | number | null} key The key for this virtual node, used when
 * diffing it against its children
 * @param {import('./internal').VNode["ref"]} ref The ref property that will
 * receive a reference to its created child
 * @returns {import('./internal').VNode}
 */
export function createVNode(type, props, key, ref, original) {
	// V8 seems to be better at detecting type shapes if the object is allocated from the same call site
	// Do not inline into createElement and coerceToVNode!
	const vnode = {
		type,
		props,
		key,
		ref,
		constructor: undefined,
		_vnodeId: original || ++vnodeId
	};

	if (options.vnode != null) options.vnode(vnode);

	return vnode;
}

/**
 * @param {import('./internal').ComponentChildren} childVNode
 * @returns {import('./internal').VNode | string | null}
 */
export function normalizeToVNode(childVNode) {
	if (childVNode == null || typeof childVNode == 'boolean') {
		return null;
	}
	// If this newVNode is being reused (e.g. <div>{reuse}{reuse}</div>) in the same diff,
	// or we are rendering a component (e.g. setState) copy the oldVNodes so it can have
	// it's own DOM & etc. pointers
	else if (
		typeof childVNode == 'number' ||
		// eslint-disable-next-line valid-typeof
		typeof childVNode == 'bigint'
	) {
		return childVNode + '';
	} else if (Array.isArray(childVNode)) {
		return createVNode(Fragment, { children: childVNode }, null, null, 0);
	}

	return childVNode;
}

export function createRef() {
	return { current: null };
}

export function Fragment(props) {
	return props.children;
}

/**
 * Check if a the argument is a valid Preact VNode.
 * @param {*} vnode
 * @returns {vnode is import('./internal').VNode}
 */
export const isValidElement = vnode =>
	vnode != null && vnode.constructor === UNDEFINED;
