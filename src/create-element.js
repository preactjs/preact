import { slice } from './util';
import options from './options';
import {
	ARRAY_CHILDREN,
	HAS_KEY,
	HAS_RAW_ARRAY_CHILDREN,
	NULL,
	SINGLE_CHILD,
	SINGLE_TEXT_CHILD,
	UNDEFINED
} from './constants';
import { isArray } from './util';

let vnodeId = 0;

/**
 * Create an virtual node (used for JSX)
 * @param {import('./internal').VNode["type"]} type The node name or Component constructor for this
 * virtual node
 * @param {object | null | undefined} [props] The properties of the virtual node
 * @param {Array<import('.').ComponentChildren>} [children] The children of the
 * virtual node
 * @returns {import('./internal').VNode}
 */
export function createElement(type, props, children) {
	let normalizedProps = {},
		key,
		ref,
		i,
		childFlags = 0;
	for (i in props) {
		if (i == 'key') key = props[i];
		else if (i == 'ref') ref = props[i];
		else normalizedProps[i] = props[i];
	}

	if (arguments.length > 2) {
		normalizedProps.children =
			arguments.length > 3 ? slice.call(arguments, 2) : children;
		childFlags = getChildFlags(
			arguments.length,
			children,
			normalizedProps.children
		);
	}

	// If a Component VNode, check for and apply defaultProps
	// Note: type may be undefined in development, must never error here.
	if (typeof type == 'function' && type.defaultProps != NULL) {
		for (i in type.defaultProps) {
			if (normalizedProps[i] === UNDEFINED) {
				normalizedProps[i] = type.defaultProps[i];
			}
		}
	}

	return createVNode(type, normalizedProps, key, ref, NULL, childFlags);
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
export function createVNode(type, props, key, ref, original, flags) {
	flags = (flags || 0) | (key != NULL ? HAS_KEY : 0);

	// V8 seems to be better at detecting type shapes if the object is allocated from the same call site
	// Do not inline into createElement and coerceToVNode!
	/** @type {import('./internal').VNode} */
	const vnode = {
		type,
		props,
		key,
		ref,
		_children: NULL,
		_parent: NULL,
		_depth: 0,
		_dom: NULL,
		_component: NULL,
		constructor: UNDEFINED,
		_original: original == NULL ? ++vnodeId : original,
		_index: -1,
		_flags: flags
	};

	// Only invoke the vnode hook if this was *not* a direct copy:
	if (original == NULL && options.vnode != NULL) options.vnode(vnode);

	return vnode;
}

export function createRef() {
	return { current: NULL };
}

export function Fragment(props) {
	return props.children;
}

/**
 * Check if a the argument is a valid Preact VNode.
 * @param {*} vnode
 * @returns {vnode is VNode}
 */
export const isValidElement = vnode =>
	vnode != NULL && vnode.constructor === UNDEFINED;

function isTextLike(value) {
	return (
		typeof value == 'string' ||
		typeof value == 'number' ||
		// eslint-disable-next-line valid-typeof
		typeof value == 'bigint' ||
		(value != NULL && value.constructor == String)
	);
}

export function getChildFlags(argLength, rawChildren, normalizedChildren) {
	if (argLength > 3) {
		let flags = ARRAY_CHILDREN;
		if (normalizedChildren.length === 1) {
			flags |= SINGLE_CHILD;
			if (isTextLike(normalizedChildren[0])) flags |= SINGLE_TEXT_CHILD;
		}
		if (hasRawArrayChildren(normalizedChildren)) {
			flags |= HAS_RAW_ARRAY_CHILDREN;
		}
		return flags;
	}

	if (argLength > 2 && rawChildren != NULL) {
		let flags = SINGLE_CHILD;
		if (isTextLike(rawChildren)) flags |= SINGLE_TEXT_CHILD;
		else if (isArray(rawChildren)) flags |= HAS_RAW_ARRAY_CHILDREN;
		return flags;
	}

	return 0;
}

export function getNormalizedChildFlags(children) {
	if (isArray(children)) {
		let flags = ARRAY_CHILDREN;
		if (children.length === 1) {
			flags |= SINGLE_CHILD;
			if (isTextLike(children[0])) flags |= SINGLE_TEXT_CHILD;
		}
		if (hasRawArrayChildren(children)) flags |= HAS_RAW_ARRAY_CHILDREN;
		return flags;
	}

	if (children != NULL) {
		let flags = SINGLE_CHILD;
		if (isTextLike(children)) flags |= SINGLE_TEXT_CHILD;
		return flags;
	}

	return 0;
}

export function setNormalizedChildFlags(vnode, children) {
	vnode._flags =
		(vnode._flags &
			~(
				ARRAY_CHILDREN |
				SINGLE_CHILD |
				SINGLE_TEXT_CHILD |
				HAS_RAW_ARRAY_CHILDREN
			)) |
		getNormalizedChildFlags(children);
}

function hasRawArrayChildren(children) {
	for (let i = 0; i < children.length; i++) {
		if (isArray(children[i])) return true;
	}
	return false;
}
