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
	/** @type {import('./internal').VNode['props']} */
	let normalizedProps = {};
	let key;
	let ref;

	if (props != null) {
		for (let i in props) {
			if (i === 'key') {
				key = props[i];
			} else if (i === 'ref') {
				ref = props[i];
			} else {
				normalizedProps[i] = props[i];
			}
		}
	}

	if (arguments.length > 3) {
		children = [children];
		// https://github.com/preactjs/preact/issues/1916
		for (let i = 3; i < arguments.length; i++) {
			children.push(arguments[i]);
		}
	}
	if (children !== undefined) {
		normalizedProps.children = children;
	}

	const vnode = {
		type,
		props: normalizedProps,
		key,
		ref,
		constructor: undefined,
		_vnodeId: ++vnodeId
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

	if (typeof childVNode === 'object') {
		return Array.isArray(childVNode)
			? createElement(Fragment, null, childVNode)
			: childVNode;
	}

	// If this newVNode is being reused (e.g. <div>{reuse}{reuse}</div>) in the same diff,
	// or we are rendering a component (e.g. setState) copy the oldVNodes so it can have
	// it's own DOM & etc. pointers
	return typeof childVNode === 'function' ? childVNode : childVNode + '';
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
