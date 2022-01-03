import { applyRef } from './refs';
import { normalizeToVNode } from '../create-element';
import {
	TYPE_COMPONENT,
	TYPE_TEXT,
	MODE_HYDRATE,
	MODE_SUSPENDED,
	EMPTY_ARR,
	TYPE_DOM,
	UNDEFINED
} from '../constants';
import { mount } from './mount';
import { patch } from './patch';
import { unmount } from './unmount';
import { createInternal, getDomSibling, getChildDom } from '../tree';

/**
 * Diff the children of a virtual node
 * @param {import('../internal').PreactElement} parentDom The DOM element whose
 * children are being diffed
 * @param {import('../internal').ComponentChildren[]} renderResult
 * @param {import('../internal').Internal} parentInternal The Internal node
 * whose children should be diff'ed against newParentVNode
 * @param {import('../internal').CommitQueue} commitQueue List of
 * components which have callbacks to invoke in commitRoot
 * @param {import('../internal').PreactElement} startDom The dom node
 * diffChildren should begin diffing with.
 */
export function diffChildren(
	parentDom,
	renderResult,
	parentInternal,
	commitQueue,
	startDom
) {
	let i, newDom, refs;

	/** @type {import('../internal').Internal} */
	let childInternal;

	/** @type {import('../internal').VNode | string} */
	let childVNode;

	let oldChildren =
		(parentInternal._children && parentInternal._children.slice()) || EMPTY_ARR;
	let oldChildrenLength = oldChildren.length;

	const newChildren = [];
	for (i = 0; i < renderResult.length; i++) {
		childVNode = normalizeToVNode(renderResult[i]);

		// Terser removes the `continue` here and wraps the loop body
		// in a `if (childVNode) { ... } condition
		if (childVNode == null) {
			newChildren[i] = null;
			continue;
		}

		childInternal = findMatchingInternal(
			childVNode,
			oldChildren,
			i,
			oldChildrenLength
		);

		let oldVNodeRef;
		let nextDomSibling;
		if (childInternal == null) {
			childInternal = createInternal(childVNode, parentInternal);

			// We are mounting a new VNode
			nextDomSibling = mount(
				parentDom,
				childVNode,
				childInternal,
				commitQueue,
				startDom
			);
		}
		// If this node suspended during hydration, and no other flags are set:
		// @TODO: might be better to explicitly check for MODE_ERRORED here.
		else if (
			(childInternal.flags & (MODE_HYDRATE | MODE_SUSPENDED)) ===
			(MODE_HYDRATE | MODE_SUSPENDED)
		) {
			// We are resuming the hydration of a VNode
			startDom = childInternal._dom;
			oldVNodeRef = childInternal.ref;

			nextDomSibling = mount(
				parentDom,
				childVNode,
				childInternal,
				commitQueue,
				startDom
			);
		} else {
			oldVNodeRef = childInternal.ref;

			// Morph the old element into the new one, but don't append it to the dom yet
			nextDomSibling = patch(
				parentDom,
				childVNode,
				childInternal,
				commitQueue,
				startDom
			);
		}

		newDom = childInternal._dom;

		if (childVNode.ref) {
			if (!refs) refs = [];
			refs.push(
				oldVNodeRef,
				childVNode.ref,
				childInternal._component || newDom,
				childInternal
			);
		}

		if (childInternal.flags & TYPE_COMPONENT) {
			startDom = nextDomSibling;
		} else if (newDom && newDom == startDom) {
			// If the newDom and the dom we are expecting to be there are the same, then
			// do nothing
			startDom = nextDomSibling;
		} else if (newDom) {
			startDom = placeChild(parentDom, newDom, startDom);
		} else if (
			startDom &&
			childInternal != null &&
			startDom.parentNode != parentDom
		) {
			// The above condition is to handle null placeholders. See test in placeholder.test.js:
			// `efficiently replace null placeholders in parent rerenders`
			startDom = nextDomSibling;
		}

		newChildren[i] = childInternal;
	}

	parentInternal._children = newChildren;

	// Remove remaining oldChildren if there are any.
	for (i = oldChildrenLength; i--; ) {
		if (oldChildren[i] != null) {
			if (
				parentInternal.flags & TYPE_COMPONENT &&
				startDom != null &&
				((oldChildren[i].flags & TYPE_DOM && oldChildren[i]._dom == startDom) ||
					getChildDom(oldChildren[i], 0) == startDom)
			) {
				// If the startDom points to a dom node that is about to be unmounted,
				// then get the next sibling of that vnode and set startDom to it
				startDom = getDomSibling(parentInternal, i + 1);
			}

			unmount(oldChildren[i], oldChildren[i]);
		}
	}

	// Set refs only after unmount
	if (refs) {
		for (i = 0; i < refs.length; i++) {
			applyRef(refs[i], refs[++i], refs[++i], refs[++i]);
		}
	}

	return startDom;
}

/**
 * @param {import('../internal').VNode | string} childVNode
 * @param {import('../internal').Internal[]} oldChildren
 * @param {number} i
 * @param {number} oldChildrenLength
 * @returns {import('../internal').Internal}
 */
function findMatchingInternal(childVNode, oldChildren, i, oldChildrenLength) {
	// Check if we find a corresponding element in oldChildren.
	// If found, delete the array item by setting to `undefined`.
	// We use `undefined`, as `null` is reserved for empty placeholders
	// (holes).
	let childInternal = oldChildren[i];

	if (typeof childVNode === 'string') {
		// We never move Text nodes, so we only check for an in-place match:
		if (childInternal && childInternal.flags & TYPE_TEXT) {
			oldChildren[i] = UNDEFINED;
		} else {
			// We're looking for a Text node, but this wasn't one: ignore it
			childInternal = UNDEFINED;
		}
	} else if (
		childInternal === null ||
		(childInternal &&
			childVNode.key == childInternal.key &&
			childVNode.type === childInternal.type)
	) {
		oldChildren[i] = UNDEFINED;
	} else {
		// Either oldVNode === undefined or oldChildrenLength > 0,
		// so after this loop oldVNode == null or oldVNode is a valid value.
		for (let j = 0; j < oldChildrenLength; j++) {
			childInternal = oldChildren[j];
			// If childVNode is unkeyed, we only match similarly unkeyed nodes, otherwise we match by key.
			// We always match by type (in either case).
			if (
				childInternal &&
				childVNode.key == childInternal.key &&
				childVNode.type === childInternal.type
			) {
				oldChildren[j] = UNDEFINED;
				break;
			}
			childInternal = null;
		}
	}

	return childInternal;
}

/**
 * @param {import('../internal').Internal} internal
 * @param {import('../internal').PreactElement} startDom
 * @param {import('../internal').PreactElement} parentDom
 */
export function reorderChildren(internal, startDom, parentDom) {
	if (internal._children == null) {
		return startDom;
	}

	for (let tmp = 0; tmp < internal._children.length; tmp++) {
		let childInternal = internal._children[tmp];
		if (childInternal) {
			// We typically enter this code path on sCU bailout, where we copy
			// oldVNode._children to newVNode._children. If that is the case, we need
			// to update the old children's _parent pointer to point to the newVNode
			// (childVNode here).
			childInternal._parent = internal;

			if (childInternal.flags & TYPE_COMPONENT) {
				startDom = reorderChildren(childInternal, startDom, parentDom);
			} else if (childInternal._dom == startDom) {
				startDom = startDom.nextSibling;
			} else {
				startDom = placeChild(parentDom, childInternal._dom, startDom);
			}
		}
	}

	return startDom;
}

/**
 * Flatten and loop through the children of a virtual node
 * @param {import('../index').ComponentChildren} children The unflattened
 * children of a virtual node
 * @returns {import('../internal').VNode[]}
 */
export function toChildArray(children, out) {
	out = out || [];
	if (children == null || typeof children == 'boolean') {
	} else if (Array.isArray(children)) {
		for (children of children) {
			toChildArray(children, out);
		}
	} else {
		out.push(children);
	}

	return out;
}

/**
 * @param {import('../internal').PreactElement} parentDom
 * @param {import('../internal').PreactElement} newDom
 * @param {import('../internal').PreactElement} startDom
 * @returns {import('../internal').PreactElement}
 */
function placeChild(parentDom, newDom, startDom) {
	if (startDom == null || newDom.parentNode == null) {
		// "startDom == null": The diff has finished with existing DOM children and
		// we are appending new ones.
		//
		// newDom.parentNode == null: newDom is a brand new unconnected DOM node. Go
		// ahead and mount it here.
		parentDom.insertBefore(newDom, startDom);
		return startDom;
	}

	let sibDom = startDom;
	while ((sibDom = sibDom.nextSibling)) {
		if (sibDom == newDom) {
			return newDom.nextSibling;
		}
	}

	parentDom.insertBefore(newDom, startDom);
	return startDom;
}
