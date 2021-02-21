import options from './options';
import {
	TYPE_FUNCTION,
	TYPE_ELEMENT,
	TYPE_TEXT,
	TYPE_CLASS,
	TYPE_ROOT,
	INHERITED_MODES,
	TYPE_COMPONENT
} from './constants';

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
	let flags = TYPE_TEXT;

	// Text VNodes/Internals use NaN as an ID so that two are never equal.
	let vnodeId = NaN;

	if (typeof vnode === 'string') {
		// type = null;
		props = vnode;
	} else if (vnode.constructor !== undefined) {
		props = '';
	} else {
		type = vnode.type;
		props = vnode.props;
		key = vnode.key;
		ref = vnode.ref;
		vnodeId = vnode._vnodeId;

		// @TODO re-enable this when we stop removing key+ref from VNode props
		if (props) {
			// if ((key = props.key) != null) {
			// 	props.key = undefined;
			// }
			// if (typeof type !== 'function' && (ref = props.ref) != null) {
			// 	props.ref = undefined;
			// }
		} else {
			props = {};
		}

		// flags = typeof type === 'function' ? COMPONENT_NODE : ELEMENT_NODE;
		flags =
			typeof type === 'function'
				? type.prototype && 'render' in type.prototype
					? TYPE_CLASS
					: props._parentDom
					? TYPE_ROOT
					: TYPE_FUNCTION
				: TYPE_ELEMENT;
	}

	/** @type {import('./internal').Internal} */
	const internal = {
		type,
		props,
		key,
		ref,
		_children: null,
		_parent: parentInternal,
		_vnodeId: vnodeId,
		_dom: null,
		_component: null,
		_flags:
			flags | (parentInternal ? parentInternal._flags & INHERITED_MODES : 0),
		_depth: parentInternal ? parentInternal._depth + 1 : 0
	};

	if (options._internal) options._internal(internal, vnode);

	return internal;
}

/**
 * @param {import('./internal').Internal} internal
 * @param {number | null} [childIndex]
 * @returns {import('./internal').PreactNode}
 */
export function getDomSibling(internal, childIndex) {
	if (childIndex == null) {
		// Use childIndex==null as a signal to resume the search from the vnode's sibling
		return internal._parent
			? getDomSibling(
					internal._parent,
					internal._parent._children.indexOf(internal) + 1
			  )
			: null;
	}

	let sibling;
	for (; childIndex < internal._children.length; childIndex++) {
		sibling = internal._children[childIndex];

		if (sibling != null && sibling._dom != null) {
			// Since updateParentDomPointers keeps _dom pointer correct,
			// we can rely on _dom to tell us if this subtree contains a
			// rendered DOM node, and what the first rendered DOM node is
			return sibling._dom;
		}
	}

	// If we get here, we have not found a DOM node in this vnode's children.
	// We must resume from this vnode's sibling (in it's parent _children array)
	// Only climb up and search the parent if we aren't searching through a DOM
	// VNode (meaning we reached the DOM parent of the original vnode that began
	// the search)
	return internal._flags & TYPE_COMPONENT ? getDomSibling(internal) : null;
}

/**
 * @param {import('./internal').Internal} internal
 */
export function updateParentDomPointers(internal) {
	if ((internal = internal._parent) != null && internal._component != null) {
		internal._dom = null;
		for (let i = 0; i < internal._children.length; i++) {
			let child = internal._children[i];
			if (child != null && child._dom != null) {
				internal._dom = child._dom;
				break;
			}
		}

		return updateParentDomPointers(internal);
	}
}

/**
 * @param {import('./internal').Internal} internal
 * @returns {import('./internal').PreactElement}
 */
export function getParentDom(internal) {
	let parentDom =
		internal._flags & TYPE_ROOT ? internal.props._parentDom : null;

	let parent = internal._parent;
	while (parentDom == null && parent) {
		if (parent._flags & TYPE_ROOT) {
			parentDom = parent.props._parentDom;
		} else if (parent._flags & TYPE_ELEMENT) {
			parentDom = parent._dom;
		} else {
			parent = parent._parent;
		}
	}

	return parentDom;
}
