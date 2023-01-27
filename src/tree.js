import options from './options';
import {
	TYPE_FUNCTION,
	TYPE_ELEMENT,
	TYPE_TEXT,
	TYPE_CLASS,
	TYPE_ROOT,
	INHERITED_MODES,
	TYPE_COMPONENT,
	MODE_SVG,
	UNDEFINED
} from './constants';
import { enqueueRender } from './component';
import {
	isComponentInternal,
	isDomInternal,
	isElementInternal,
	isRootInternal
} from './helpers';

/**
 * Create an internal tree node
 * @param {import('./internal').VNode | string} vnode
 * @param {import('./internal').Internal} [parentInternal]
 * @returns {import('./internal').Internal}
 */
export function createInternal(vnode, parentInternal) {
	let type = null,
		props,
		key,
		ref;

	/** @type {number} */
	let flags = parentInternal ? parentInternal.flags & INHERITED_MODES : 0;

	// Text VNodes/Internals have an ID of 0 that is never used:
	let vnodeId = 0;

	if (typeof vnode == 'string') {
		// type = null;
		flags |= TYPE_TEXT;
		props = vnode;
	}
	// Prevent JSON injection by rendering injected objects as empty Text nodes
	else if (vnode.constructor !== UNDEFINED) {
		flags |= TYPE_TEXT;
		props = '';
	} else {
		type = vnode.type;
		props = vnode.props;
		key = vnode.key;
		ref = vnode.ref;
		vnodeId = vnode._vnodeId;

		// @TODO re-enable this when we stop removing key+ref from VNode props
		// if (props) {
		// 	if ((key = props.key) != null) {
		// 		props.key = UNDEFINED;
		// 	}
		// 	if (typeof type !== 'function' && (ref = props.ref) != null) {
		// 		props.ref = UNDEFINED;
		// 	}
		// } else {
		// 	props = {};
		// }

		// flags = typeof type === 'function' ? COMPONENT_NODE : ELEMENT_NODE;
		flags |=
			typeof type == 'function'
				? type.prototype && type.prototype.render
					? TYPE_CLASS
					: props._parentDom
					? TYPE_ROOT
					: TYPE_FUNCTION
				: TYPE_ELEMENT;

		if (flags & TYPE_ELEMENT && type === 'svg') {
			flags |= MODE_SVG;
		} else if (
			parentInternal &&
			parentInternal.flags & MODE_SVG &&
			parentInternal.type === 'foreignObject'
		) {
			flags &= ~MODE_SVG;
		}
	}

	/** @type {import('./internal').Internal} */
	const internal = {
		type,
		props,
		key,
		ref,
		data:
			flags & TYPE_COMPONENT
				? { _commitCallbacks: [], _context: null, _stateCallbacks: [] }
				: null,
		rerender: enqueueRender,
		flags,
		_children: null,
		_parent: parentInternal,
		_vnodeId: vnodeId,
		_component: null,
		_depth: parentInternal ? parentInternal._depth + 1 : 0
	};

	if (options._internal) options._internal(internal, vnode);

	return internal;
}

const shouldSearchComponent = internal =>
	isComponentInternal(internal) &&
	(!isRootInternal(internal) ||
		internal.props._parentDom == getParentDom(internal._parent));

/**
 * @param {import('./internal').Internal} internal
 * @param {number | null} [childIndex]
 * @returns {import('./internal').PreactNode}
 */
export function getDomSibling(internal, childIndex) {
	if (childIndex == null) {
		// Use childIndex==null as a signal to resume the search from the vnode's sibling
		return getDomSibling(
			internal._parent,
			internal._parent._children.indexOf(internal) + 1
		);
	}

	let childDom = getChildDom(internal, childIndex);
	if (childDom) {
		return childDom;
	}

	// If we get here, we have not found a DOM node in this vnode's children. We
	// must resume from this vnode's sibling (in it's parent _children array).
	// Only climb up and search the parent if we aren't searching through a DOM
	// VNode (meaning we reached the DOM parent of the original vnode that began
	// the search). Note, the top of the tree has _parent == null so avoiding that
	// here.
	return internal._parent && shouldSearchComponent(internal)
		? getDomSibling(internal)
		: null;
}

/**
 * @param {import('./internal').Internal} internal
 * @param {number} offset
 * @returns {import('./internal').PreactElement}
 */
export function getChildDom(internal, offset) {
	if (internal._children == null) {
		return null;
	}

	for (; offset < internal._children.length; offset++) {
		let child = internal._children[offset];
		if (child != null) {
			if (isDomInternal(child)) {
				return child.data;
			}

			if (shouldSearchComponent(child)) {
				let childDom = getChildDom(child, 0);
				if (childDom) {
					return childDom;
				}
			}
		}
	}

	return null;
}
/**
 * @param {import('./internal').Internal} internal
 * @returns {any}
 */
export function getParentContext(internal) {
	// @TODO: compare performance of recursion here (it's 11b smaller, but may be slower for deep trees)
	return internal.data._context || getParentContext(internal._parent);

	// while ((internal = internal._parent)) {
	// 	let context = internal._context;
	// 	if (context != null) return context;
	// }
}

/**
 * @param {import('./internal').Internal} internal
 * @returns {import('./internal').PreactElement}
 */
export function getParentDom(internal) {
	let parent = internal;

	// if this is a Root internal, return its parent DOM:
	if (isRootInternal(parent)) {
		return parent.props._parentDom;
	}

	// walk up the tree to find the nearest DOM or Root Internal:
	while ((parent = parent._parent)) {
		if (isRootInternal(parent)) {
			return parent.props._parentDom;
		} else if (isElementInternal(parent)) {
			return parent.data;
		}
	}
}
