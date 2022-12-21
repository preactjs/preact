import options from './options';
import {
	TYPE_FUNCTION,
	TYPE_ELEMENT,
	TYPE_TEXT,
	TYPE_CLASS,
	TYPE_ROOT,
	INHERITED_MODES,
	TYPE_COMPONENT,
	TYPE_DOM,
	MODE_SVG,
	UNDEFINED
} from './constants';
import { enqueueRender } from './component';

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
		_prevRef: null,
		data:
			flags & TYPE_COMPONENT
				? { _commitCallbacks: [], _stateCallbacks: [] }
				: null,
		rerender: enqueueRender,
		flags,
		_parent: parentInternal,
		_child: null,
		_next: null,
		_vnodeId: vnodeId,
		_component: null,
		_context: null,
		_depth: parentInternal ? parentInternal._depth + 1 : 0
	};

	if (options._internal) options._internal(internal, vnode);

	return internal;
}

const shouldSearchComponent = internal =>
	internal.flags & TYPE_COMPONENT &&
	(!(internal.flags & TYPE_ROOT) ||
		internal.props._parentDom == getParentDom(internal._parent));

/**
 * Get the next DOM Internal after a given index within a parent Internal.
 * If `childIndex` is `null`, finds the next DOM Internal sibling of the given Internal.
 * @param {import('./internal').Internal} internal
 * @param {never} [childIndex] todo - replace parent+index with child internal reference
 * @returns {import('./internal').PreactNode}
 */
export function getDomSibling(internal, childIndex) {
	// basically looking for the next pointer that can be used to perform an insertBefore:
	// @TODO inline the null case, since it's only used in patch.
	if (childIndex == null) {
		// Use childIndex==null as a signal to resume the search from the vnode's sibling
		const next = internal._next;
		return next && (getChildDom(next) || getDomSibling(next));

		// return next && (getChildDom(next) || getDomSibling(next));
		// let sibling = internal;
		// while (sibling = sibling._next) {
		// 	let domChildInternal = getChildDom(sibling);
		// 	if (domChildInternal) return domChildInternal;
		// }

		// const parent = internal._parent;
		// let child = parent._child;
		// while (child) {
		// 	if (child === internal) {
		// 		return getDomSibling(child._next);
		// 	}
		// 	child = child._next;
		// }

		// return getDomSibling(
		// 	internal._parent,
		// 	internal._parent._children.indexOf(internal) + 1
		// );
	}

	let childDom = getChildDom(internal._child);
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
 * Get the root DOM element for a given subtree.
 * Returns the nearest DOM element within a given Internal's subtree.
 * If the provided Internal _is_ a DOM Internal, its DOM will be returned.
 * @param {import('./internal').Internal} internal The internal to begin the search
 * @returns {import('./internal').PreactElement}
 */
export function getChildDom(internal) {
	while (internal) {
		// this is a DOM internal
		if (internal.flags & TYPE_DOM) {
			// @ts-ignore this is an Element Internal, .data is a PreactElement.
			return internal.data;
		}

		// This is a Component internal (but might be a root/portal).
		// Find its first DOM child, unless it's a portal:
		// @todo - this is an inlined version of shouldSearchComponent without the type=component guard.
		if (
			!(internal.flags & TYPE_ROOT) ||
			internal.props._parentDom == getParentDom(internal._parent)
		) {
			const childDom = getChildDom(internal._child);
			if (childDom) return childDom;
		}

		internal = internal._next;
	}

	return null;
}
/**
 * @param {import('./internal').Internal} internal
 * @returns {any}
 */
export function getParentContext(internal) {
	// @TODO: compare performance of recursion here (it's 11b smaller, but may be slower for deep trees)
	return internal._context || getParentContext(internal._parent);

	// while ((internal = internal._parent)) {
	// 	let context = internal._context;
	// 	if (context != null) return context;
	// }
}

/**
 * Get the parent DOM for an Internal. If the Internal is a Root, returns its DOM root.
 * @param {import('./internal').Internal} internal
 * @returns {import('./internal').PreactElement}
 */
export function getParentDom(internal) {
	// if this is a Root internal, return its parent DOM:
	if (internal.flags & TYPE_ROOT) {
		return internal.props._parentDom;
	}

	// walk up the tree to find the nearest DOM or Root Internal:
	while ((internal = internal._parent)) {
		if (internal.flags & TYPE_ELEMENT) {
			return internal.data;
		}
		if (internal.flags & TYPE_ROOT) {
			return internal.props._parentDom;
		}
	}
}
