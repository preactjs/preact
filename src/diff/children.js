import { applyRef } from './refs';
import { normalizeToVNode } from '../create-element';
import {
	COMPONENT_NODE,
	EMPTY_ARR,
	MODE_HYDRATE,
	MODE_SUSPENDED,
	TEXT_NODE
} from '../constants';
import { getDomSibling } from '../component';
import { mount } from './mount';
import { patch } from './patch';
import { unmount } from './unmount';
import { createInternal } from '../tree';

/**
 * Diff the children of a virtual node
 * @param {import('../internal').PreactElement} parentDom The DOM element whose
 * children are being diffed
 * @param {import('../internal').ComponentChildren[]} renderResult
 * @param {import('../internal').VNode} newParentVNode The new virtual node
 * whose children should be diff'ed against oldParentVNode
 * @param {import('../internal').Internal} internal The Internal node
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
	internal,
	globalContext,
	isSvg,
	commitQueue,
	startDom
) {
	let i, j, newDom, firstChildDom, refs;

	/** @type {import('../internal').Internal} */
	let childInternal;

	/** @type {import('../internal').VNode | string} */
	let childVNode;

	let oldChildren = internal._children || EMPTY_ARR;
	let oldChildrenLength = oldChildren.length;

	const newChildren = [];
	for (i = 0; i < renderResult.length; i++) {
		childVNode = normalizeToVNode(renderResult[i]);
		//newChildren[i] = childVNode;

		// Terser removes the `continue` here and wraps the loop body
		// in a `if (childVNode) { ... } condition
		if (childVNode == null || childVNode.constructor !== undefined) {
			// @TODO: assign `newChildren[i] = null`?
			newChildren[i] = null;
			continue;
		}

		// childVNode._parent = internal;
		// childVNode._depth = newParentVNode._depth + 1;

		// Check if we find a corresponding element in oldChildren.
		// If found, delete the array item by setting to `undefined`.
		// We use `undefined`, as `null` is reserved for empty placeholders
		// (holes).
		childInternal = oldChildren[i];

		if (
			childInternal === null ||
			(childInternal &&
				childVNode.key == childInternal.key &&
				childVNode.type === childInternal.type)
		) {
			oldChildren[i] = undefined;
		} else {
			// Either oldVNode === undefined or oldChildrenLength > 0,
			// so after this loop oldVNode == null or oldVNode is a valid value.
			for (j = 0; j < oldChildrenLength; j++) {
				childInternal = oldChildren[j];
				// If childVNode is unkeyed, we only match similarly unkeyed nodes, otherwise we match by key.
				// We always match by type (in either case).
				if (
					childInternal &&
					childVNode.key == childInternal.key &&
					childVNode.type === childInternal.type
				) {
					oldChildren[j] = undefined;
					break;
				}
				childInternal = null;
			}
		}

		let prevDom;
		let oldVNodeRef;
		let nextDomSibling;
		if (childInternal == null) {
			childInternal = createInternal(childVNode);

			// We are mounting a new VNode
			nextDomSibling = mount(
				parentDom,
				childInternal,
				globalContext,
				isSvg,
				commitQueue,
				startDom
			);
		}
		// If this node suspended during hydration, and no other flags are set:
		// @TODO: might be better to explicitly check for MODE_ERRORED here.
		else if ((childInternal._mode ^ (MODE_HYDRATE | MODE_SUSPENDED)) === 0) {
			// We are resuming the hydration of a VNode
			startDom = childInternal._dom;
			// Resume the same mode as before suspending
			// childVNode._mode = oldInternal._mode;
			oldVNodeRef = childInternal.ref;

			nextDomSibling = mount(
				parentDom,
				childInternal,
				globalContext,
				isSvg,
				commitQueue,
				startDom
			);
		} else {
			// this was previously captured after patch(), which seems backwards?
			oldVNodeRef = childInternal.ref;
			prevDom = childInternal._dom;

			// Morph the old element into the new one, but don't append it to the dom yet
			nextDomSibling = patch(
				parentDom,
				childVNode,
				childInternal,
				globalContext,
				isSvg,
				commitQueue,
				startDom
			);

			// oldVNodeRef = childInternal.ref;
		}

		newDom = childInternal._dom;

		if (childVNode.ref && oldVNodeRef != childVNode.ref) {
			if (!refs) refs = [];
			if (oldVNodeRef) refs.push(oldVNodeRef, null, childInternal);
			refs.push(
				childVNode.ref,
				childInternal._component || newDom,
				childInternal
			);
		}

		if (newDom != null) {
			if (firstChildDom == null) {
				firstChildDom = newDom;
			}

			if (childInternal._flags & COMPONENT_NODE) {
				// // @TODO: this needs to happen unconditionally in patch()
				// if (
				// 	childInternal != null &&
				// 	childVNode.props &&
				// 	childVNode.props.children != null &&
				// 	childVNode.props.children === childInternal.props.children
				// ) {
				// 	startDom = reorderChildren(childInternal, startDom, parentDom);
				// } else {
				// startDom = nextDomSibling;
				// }

				startDom = nextDomSibling;
			} else if (newDom == startDom) {
				// If the newDom and the dom we are expecting to be there are the same, then
				// do nothing
				startDom = nextDomSibling;
			} else {
				startDom = placeChild(parentDom, oldChildrenLength, newDom, startDom);
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
			if (internal.type === 'option') {
				// @ts-ignore We have validated that the type of parentDOM is 'option'
				// in the above check
				parentDom.value = '';
			}
		} else if (
			startDom &&
			childInternal != null &&
			prevDom == startDom &&
			startDom.parentNode != parentDom
		) {
			// The above condition is to handle null placeholders. See test in placeholder.test.js:
			// `efficiently replace null placeholders in parent rerenders`
			startDom = nextDomSibling; // Note: change works in restructure. Not dependent on backing tree
		}

		newChildren[i] = childInternal;
	}

	internal._children = newChildren;

	// newParentVNode._dom = firstChildDom;
	internal._dom = firstChildDom;

	// Remove remaining oldChildren if there are any.
	for (i = oldChildrenLength; i--; ) {
		if (oldChildren[i] != null) {
			if (
				internal._flags & COMPONENT_NODE &&
				startDom != null &&
				oldChildren[i]._dom == startDom
			) {
				// If the startDom points to a dom node that is about to be unmounted,
				// then get the next sibling of that vnode and set startDom to it
				startDom = getDomSibling(internal, i + 1);
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

	return startDom;
}

/**
 * @param {import('../internal').Internal} internal
 * @param {import('../internal').PreactElement} startDom
 * @param {import('../internal').PreactElement} parentDom
 */
function reorderChildren(internal, startDom, parentDom) {
	for (let tmp = 0; tmp < internal._children.length; tmp++) {
		let childInternal = internal._children[tmp];
		if (childInternal) {
			// We typically enter this code path on sCU bailout, where we copy
			// oldVNode._children to newVNode._children. If that is the case, we need
			// to update the old children's _parent pointer to point to the newVNode
			// (childVNode here).
			childInternal._parent = internal;

			if (typeof childInternal.type == 'function') {
				startDom = reorderChildren(childInternal, startDom, parentDom);
			} else if (childInternal._dom == startDom) {
				startDom = startDom.nextSibling;
			} else {
				startDom = placeChild(
					parentDom,
					internal._children.length,
					childInternal._dom,
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
 * @param {number} oldChildrenLength
 * @param {import('../internal').PreactElement} newDom
 * @param {import('../internal').PreactElement} startDom
 * @returns {import('../internal').PreactElement}
 */
function placeChild(parentDom, oldChildrenLength, newDom, startDom) {
	if (startDom == null || newDom.parentNode == null) {
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
		(sibDom = sibDom.nextSibling) && j < oldChildrenLength;
		j += 2
	) {
		if (sibDom == newDom) {
			return newDom.nextSibling;
		}
	}
	parentDom.insertBefore(newDom, startDom);
	return startDom;
}
