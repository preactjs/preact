import { applyRef } from './refs';
import { normalizeToVNode } from '../create-element';
import { EMPTY_OBJ, EMPTY_ARR } from '../constants';
import { getDomSibling } from '../component';
import { mount } from './mount';
import { patch } from './patch';
import { unmount } from './unmount';

/**
 * Diff the children of a virtual node
 * @param {import('../internal').PreactElement} parentDom The DOM element whose
 * children are being diffed
 * @param {import('../internal').ComponentChildren[]} renderResult
 * @param {import('../internal').VNode} newParentVNode The new virtual node
 * whose children should be diff'ed against oldParentVNode
 * @param {import('../internal').VNode} oldParentVNode The old virtual node
 * whose children should be diff'ed against newParentVNode
 * @param {object} globalContext The current context object - modified by
 * getChildContext
 * @param {boolean} isSvg Whether or not this DOM node is an SVG node
 * @param {Array<import('../internal').Component>} commitQueue List of
 * components which have callbacks to invoke in commitRoot
 * @param {import('../internal').PreactElement} startDom The dom node
 * diffChildren should begin diffing with.
 */
export function diffChildren(
	parentDom,
	renderResult,
	newParentVNode,
	oldParentVNode,
	globalContext,
	isSvg,
	commitQueue,
	startDom
) {
	let i, j, oldVNode, childVNode, newDom, firstChildDom, refs;

	// This is a compression of oldParentVNode!=null && oldParentVNode != EMPTY_OBJ && oldParentVNode._children || EMPTY_ARR
	// as EMPTY_OBJ._children should be `undefined`.
	let oldChildren = (oldParentVNode && oldParentVNode._children) || EMPTY_ARR;

	let oldChildrenLength = oldChildren.length;

	newParentVNode._children = [];
	for (i = 0; i < renderResult.length; i++) {
		childVNode = renderResult[i];
		childVNode = newParentVNode._children[i] = normalizeToVNode(
			renderResult[i]
		);

		// Terser removes the `continue` here and wraps the loop body
		// in a `if (childVNode) { ... } condition
		if (childVNode == null) {
			continue;
		}

		childVNode._parent = newParentVNode;
		childVNode._depth = newParentVNode._depth + 1;

		// Check if we find a corresponding element in oldChildren.
		// If found, delete the array item by setting to `undefined`.
		// We use `undefined`, as `null` is reserved for empty placeholders
		// (holes).
		oldVNode = oldChildren[i];

		if (
			oldVNode === null ||
			(oldVNode &&
				childVNode.key == oldVNode.key &&
				childVNode.type === oldVNode.type)
		) {
			oldChildren[i] = undefined;
		} else {
			// Either oldVNode === undefined or oldChildrenLength > 0,
			// so after this loop oldVNode == null or oldVNode is a valid value.
			for (j = 0; j < oldChildrenLength; j++) {
				oldVNode = oldChildren[j];
				// If childVNode is unkeyed, we only match similarly unkeyed nodes, otherwise we match by key.
				// We always match by type (in either case).
				if (
					oldVNode &&
					childVNode.key == oldVNode.key &&
					childVNode.type === oldVNode.type
				) {
					oldChildren[j] = undefined;
					break;
				}
				oldVNode = null;
			}
		}

		oldVNode = oldVNode || EMPTY_OBJ;

		let oldVNodeRef;

		if (oldVNode == EMPTY_OBJ) {
			// We are mounting a new VNode
			mount(
				parentDom,
				childVNode,
				globalContext,
				isSvg,
				null,
				commitQueue,
				startDom
			);
		} else if (oldVNode._hydrating != null) {
			// We are resuming the hydration of a VNode
			startDom = childVNode._dom = oldVNode._dom;
			childVNode._hydrating = null;
			oldVNodeRef = oldVNode.ref;

			mount(
				parentDom,
				childVNode,
				globalContext,
				isSvg,
				[startDom],
				commitQueue,
				startDom,
				oldVNode._hydrating
			);
		} else {
			// Morph the old element into the new one, but don't append it to the dom yet
			patch(
				parentDom,
				childVNode,
				oldVNode,
				globalContext,
				isSvg,
				commitQueue,
				startDom
			);

			oldVNodeRef = oldVNode.ref;
		}

		newDom = childVNode._dom;

		if (childVNode.ref && oldVNodeRef != childVNode.ref) {
			if (!refs) refs = [];
			if (oldVNodeRef) refs.push(oldVNodeRef, null, childVNode);
			refs.push(childVNode.ref, childVNode._component || newDom, childVNode);
		}

		if (newDom != null) {
			if (firstChildDom == null) {
				firstChildDom = newDom;
			}

			if (
				typeof childVNode.type == 'function' &&
				childVNode._children != null && // Can be null if childVNode suspended
				childVNode._children === oldVNode._children
			) {
				childVNode._nextDom = startDom = reorderChildren(
					childVNode,
					startDom,
					parentDom
				);
			} else {
				startDom = placeChild(
					parentDom,
					childVNode,
					oldChildren,
					newDom,
					startDom
				);
			}

			// Browsers will infer an option's `value` from `textContent` when
			// no value is present. This essentially bypasses our code to set it
			// later in `diff()`. It works fine in all browsers except for IE11
			// where it breaks setting `select.value`. There it will be always set
			// to an empty string. Re-applying an options value will fix that, so
			// there are probably some internal data structures that aren't
			// updated properly.
			//
			// To fix it we make sure to reset the inferred value, so that our own
			// value check in `diff()` won't be skipped.
			if (newParentVNode.type === 'option') {
				// @ts-ignore We have validated that the type of parentDOM is 'option'
				// in the above check
				parentDom.value = '';
			} else if (typeof newParentVNode.type == 'function') {
				// Because the newParentVNode is Fragment-like, we need to set it's
				// _nextDom property to the nextSibling of its last child DOM node.
				//
				// `startDom` contains the correct value here because if the last child
				// is a Fragment-like, then startDom has already been set to that
				// child's _nextDom. If the last child is a DOM VNode, then startDom
				// will be set to that DOM node's nextSibling.
				newParentVNode._nextDom = startDom;
			}
		} else if (
			startDom &&
			oldVNode._dom == startDom &&
			startDom.parentNode != parentDom
		) {
			// The above condition is to handle null placeholders. See test in placeholder.test.js:
			// `efficiently replace null placeholders in parent rerenders`
			startDom = getDomSibling(oldVNode);
		}
	}

	newParentVNode._dom = firstChildDom;

	// Remove remaining oldChildren if there are any.
	for (i = oldChildrenLength; i--; ) {
		if (oldChildren[i] != null) {
			if (
				typeof newParentVNode.type == 'function' &&
				oldChildren[i]._dom != null &&
				oldChildren[i]._dom == newParentVNode._nextDom
			) {
				// If the newParentVNode.__nextDom points to a dom node that is about to
				// be unmounted, then get the next sibling of that vnode and set
				// _nextDom to it
				newParentVNode._nextDom = getDomSibling(oldParentVNode, i + 1);
			}

			unmount(oldChildren[i], oldChildren[i]);
		}
	}

	// Set refs only after unmount
	if (refs) {
		for (i = 0; i < refs.length; i++) {
			applyRef(refs[i], refs[++i], refs[++i]);
		}
	}
}

function reorderChildren(childVNode, startDom, parentDom) {
	for (let tmp = 0; tmp < childVNode._children.length; tmp++) {
		let vnode = childVNode._children[tmp];
		if (vnode) {
			// We typically enter this code path on sCU bailout, where we copy
			// oldVNode._children to newVNode._children. If that is the case, we need
			// to update the old children's _parent pointer to point to the newVNode
			// (childVNode here).
			vnode._parent = childVNode;

			if (typeof vnode.type == 'function') {
				startDom = reorderChildren(vnode, startDom, parentDom);
			} else {
				startDom = placeChild(
					parentDom,
					vnode,
					childVNode._children,
					vnode._dom,
					startDom
				);
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
		children.some(child => {
			toChildArray(child, out);
		});
	} else {
		out.push(children);
	}
	return out;
}

/**
 * @param {import('../internal').PreactElement} parentDom
 * @param {import('../internal').VNode} childVNode
 * @param {import('../internal').VNode[]} oldChildren
 * @param {import('../internal').PreactElement} newDom
 * @param {import('../internal').PreactElement} startDom
 * @returns {import('../internal').PreactElement}
 */
function placeChild(parentDom, childVNode, oldChildren, newDom, startDom) {
	if (childVNode._nextDom !== undefined) {
		// Only Fragments or components that return Fragment like VNodes will
		// have a non-undefined _nextDom. Continue the diff from the sibling
		// of last DOM child of this child VNode
		let nextDom = childVNode._nextDom;

		// Eagerly cleanup _nextDom. We don't need to persist the value because
		// it is only used by `diffChildren` to determine where to resume the diff after
		// diffing Components and Fragments. Once we store it the nextDOM local var, we
		// can clean up the property
		childVNode._nextDom = undefined;

		return nextDom;
	} else if (newDom == startDom) {
		// If the newDom and the dom we are expecting to be there are the same, then
		// do nothing
		return newDom.nextSibling;
	} else if (startDom == null || newDom.parentNode == null) {
		// "startDom == null": The diff has finished with existing DOM children and
		// we are appending new ones.
		//
		// newDom.parentNode == null: newDom is a brand new unconnected DOM node. Go
		// ahead and mount it here.
		parentDom.insertBefore(newDom, startDom);
		return startDom;
	}

	// `j<oldChildrenLength; j+=2` is an alternative to `j++<oldChildrenLength/2`
	for (
		let sibDom = startDom, j = 0;
		(sibDom = sibDom.nextSibling) && j < oldChildren.length;
		j += 2
	) {
		if (sibDom == newDom) {
			return newDom.nextSibling;
		}
	}
	parentDom.insertBefore(newDom, startDom);
	return startDom;
}
