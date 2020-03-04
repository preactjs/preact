import options from './options';

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
		i;
	for (i in props) {
		if (i !== 'key' && i !== 'ref') normalizedProps[i] = props[i];
	}

	if (arguments.length > 3) {
		children = [children];
		// https://github.com/preactjs/preact/issues/1916
		for (i = 3; i < arguments.length; i++) {
			children.push(arguments[i]);
		}
	}
	if (children != null) {
		normalizedProps.children = children;
	}

	// If a Component VNode, check for and apply defaultProps
	// Note: type may be undefined in development, must never error here.
	if (typeof type === 'function' && type.defaultProps != null) {
		for (i in type.defaultProps) {
			if (normalizedProps[i] === undefined) {
				normalizedProps[i] = type.defaultProps[i];
			}
		}
	}

	return createVNode(
		type,
		normalizedProps,
		props && props.key,
		props && props.ref
	);
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
export function createVNode(type, props, key, ref) {
	// V8 seems to be better at detecting type shapes if the object is allocated from the same call site
	// Do not inline into createElement and coerceToVNode!
	const vnode = {
		type,
		props,
		key,
		ref,
		_children: null,
		_parent: null,
		_depth: 0,
		_dom: null,
		// _nextDom must be initialized to undefined b/c it will eventually
		// be set to dom.nextSibling which can return `null` and it is important
		// to be able to distinguish between an uninitialized _nextDom and
		// a _nextDom that has been set to `null`
		_nextDom: undefined,
		_component: null,
		constructor: undefined
	};

	if (options.vnode) options.vnode(vnode);

	return vnode;
}

/**
 * Create an virtual node (used for JSX). It's the successor of `createElement`.
 * @param {import('./internal').VNode["type"]} type The node name or Component
 * constructor for this virtual node
 * @param {object | null | undefined} [props] The properties of the virtual node
 * @param {string | undefined} [key] Optional key
 * @param {boolean} [isStaticChildren] Marks if `jsx` or `jsxs` should be used.
 * For us they are the same thing as our debug warnings live in a separate
 * module (`preact/debug`). Only available via `jsxDEV`
 * @param {import('./internal').DevSource} [source] Optional source location
 * info from babel. Only available via `jsxDEV`
 * @param {import('./internal').DevSource} [self] Optional reference to the
 * component this node is part of. Only available via `jsxDEV`
 * @returns {import('./internal').VNode}
 */
export function jsx(type, props, key, isStaticChildren, source, self) {
	let i;

	// If a Component VNode, check for and apply defaultProps
	// Note: type may be undefined in development, must never error here.
	if (typeof type === 'function' && type.defaultProps != null) {
		for (i in type.defaultProps) {
			if (props[i] === undefined) {
				props[i] = type.defaultProps[i];
			}
		}
	}

	const vnode = createVNode(type, props, key, props && props.ref);

	// TODO: Should this be inlined into `createVNode`?
	if (source || self) {
		vnode.__source = source;
		vnode.__self = self;
	}
	return vnode;
}

// The difference between `jsxs` and `jsx` is that the former is used by babel
// when the node has more than one child
export const jsxs = jsx;

// Same as `jsx`, but with supplied `source` and `self` information
export const jsxDEV = jsx;

export function createRef() {
	return {};
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
	vnode != null && vnode.constructor === undefined;
