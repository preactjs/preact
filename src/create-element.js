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
		if (i == 'key') key = props[i];
		else if (i == 'ref') ref = props[i];
		else normalizedProps[i] = props[i];
	}

	if (arguments.length > 3) {
		children = [children];
		// https://github.com/preactjs/preact/issues/1916
		for (i = 3; i < arguments.length; i++) {
			children.push(arguments[i]);
		}
	}

	if (Array.isArray(children)) {
		normalizedProps.children = [];
		for (i = 0; i < children.length; i++) {
			normalizedProps.children.push(children[i]);
			let currentIndex = normalizedProps.children.length - 1, j = i + 1;
			while (children[i] && children[j] && typeof children[i] !== 'object' && typeof children[j] !== 'object') {
				normalizedProps.children[currentIndex] += '' + children[j]
				j++
			}
			i = j - 1
		}
	} else if (children !== undefined) {
		normalizedProps.children = children;
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
	let type = typeof childVNode;
	if (childVNode == null || type === 'boolean') {
		return null;
	}
	if (type === 'object') {
		if (Array.isArray(childVNode)) {
			return createVNode(Fragment, { children: childVNode }, null, null, 0);
		}
	} else if (type !== 'string' && type !== 'function') {
		return String(childVNode);
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
