import { applyRef } from './refs';
import { normalizeToVNode } from '../create-element';
import {
	TYPE_COMPONENT,
	MODE_HYDRATE,
	MODE_SUSPENDED,
	EMPTY_ARR,
	TYPE_DOM,
	UNDEFINED
} from '../constants';
import { mount } from './mount';
import { patch } from './patch';
import { unmount } from './unmount';
import { createInternal, getDomSibling } from '../tree';
import { rendererState } from './commit';

/**
 * Update an internal with new children.
 * @param {import('../internal').Internal} internal The internal whose children should be patched
 * @param {import('../internal').ComponentChild[]} children The new children, represented as VNodes
 */
export function patchChildren(internal, children) {
	let oldChildren =
		(internal._children && internal._children.slice()) || EMPTY_ARR;

	let oldChildrenLength = oldChildren.length;
	let remainingOldChildren = oldChildrenLength;

	let skew = 0;
	let i;

	/** @type {import('../internal').Internal} */
	let childInternal;

	/** @type {import('../internal').ComponentChild} */
	let childVNode;

	/** @type {import('../internal').Internal[]} */
	const newChildren = [];

	for (i = 0; i < children.length; i++) {
		childVNode = normalizeToVNode(children[i]);

		// Terser removes the `continue` here and wraps the loop body
		// in a `if (childVNode) { ... } condition
		if (childVNode == null) {
			newChildren[i] = null;
			continue;
		}

		let skewedIndex = i + skew;

		/// TODO: Reconsider if we should bring back the "not moving text nodes" logic?
		let matchingIndex = findMatchingIndex(
			childVNode,
			oldChildren,
			skewedIndex,
			remainingOldChildren
		);

		if (matchingIndex === -1) {
			childInternal = UNDEFINED;
		} else {
			childInternal = oldChildren[matchingIndex];
			oldChildren[matchingIndex] = UNDEFINED;
			remainingOldChildren--;
		}

		let mountingChild = childInternal == null;

		if (mountingChild) {
			childInternal = createInternal(childVNode, internal);

			// We are mounting a new VNode
			mount(childInternal, childVNode, getDomSibling(internal, skewedIndex));
		}
		// If this node suspended during hydration, and no other flags are set:
		// @TODO: might be better to explicitly check for MODE_ERRORED here.
		else if (
			(childInternal.flags & (MODE_HYDRATE | MODE_SUSPENDED)) ===
			(MODE_HYDRATE | MODE_SUSPENDED)
		) {
			// We are resuming the hydration of a VNode
			mount(childInternal, childVNode, childInternal._dom);
		} else {
			// Morph the old element into the new one, but don't append it to the dom yet
			patch(childInternal, childVNode);
		}

		go: if (mountingChild) {
			if (matchingIndex == -1) {
				skew--;
			}

			// Perform insert of new dom
			if (childInternal.flags & TYPE_DOM) {
				rendererState._parentDom.insertBefore(
					childInternal._dom,
					getDomSibling(internal, skewedIndex)
				);
			}
		} else if (matchingIndex !== skewedIndex) {
			// Move this DOM into its correct place
			if (matchingIndex === skewedIndex + 1) {
				skew++;
				break go;
			} else if (matchingIndex > skewedIndex) {
				if (remainingOldChildren > children.length - skewedIndex) {
					skew += matchingIndex - skewedIndex;
					break go;
				} else {
					// ### Change from keyed: I think this was missing from the algo...
					skew--;
				}
			} else if (matchingIndex < skewedIndex) {
				if (matchingIndex == skewedIndex - 1) {
					skew = matchingIndex - skewedIndex;
				} else {
					skew = 0;
				}
			} else {
				skew = 0;
			}

			skewedIndex = i + skew;

			if (matchingIndex == i) break go;

			let nextSibling = getDomSibling(internal, skewedIndex + 1);
			if (childInternal.flags & TYPE_DOM) {
				rendererState._parentDom.insertBefore(childInternal._dom, nextSibling);
			} else {
				insertComponentDom(
					childInternal,
					nextSibling,
					rendererState._parentDom
				);
			}
		}

		newChildren[i] = childInternal;
	}

	internal._children = newChildren;

	// Remove remaining oldChildren if there are any.
	if (remainingOldChildren > 0) {
		for (i = oldChildrenLength; i--; ) {
			if (oldChildren[i] != null) {
				unmount(oldChildren[i], oldChildren[i]);
			}
		}
	}

	// Set refs only after unmount
	for (i = 0; i < newChildren.length; i++) {
		childInternal = newChildren[i];
		if (childInternal) {
			let oldRef = childInternal._prevRef;
			if (childInternal.ref != oldRef) {
				if (oldRef) applyRef(oldRef, null, childInternal);
				if (childInternal.ref)
					applyRef(
						childInternal.ref,
						childInternal._component || childInternal._dom,
						childInternal
					);
			}
		}
	}
}

/**
 * @param {import('../internal').VNode | string} childVNode
 * @param {import('../internal').Internal[]} oldChildren
 * @param {number} skewedIndex
 * @param {number} remainingOldChildren
 * @returns {number}
 */
function findMatchingIndex(
	childVNode,
	oldChildren,
	skewedIndex,
	remainingOldChildren
) {
	const type = typeof childVNode === 'string' ? null : childVNode.type;
	const key = type !== null ? childVNode.key : UNDEFINED;
	let match = -1;
	let x = skewedIndex - 1; // i - 1;
	let y = skewedIndex + 1; // i + 1;
	let oldChild = oldChildren[skewedIndex]; // i

	if (
		// ### Change from keyed: support for matching null placeholders
		oldChild === null ||
		(oldChild != null && oldChild.type === type && oldChild.key == key)
	) {
		match = skewedIndex; // i
	}
	// If there are any unused children left (ignoring an available in-place child which we just checked)
	else if (remainingOldChildren > (oldChild != null ? 1 : 0)) {
		// eslint-disable-next-line no-constant-condition
		while (true) {
			if (x >= 0) {
				oldChild = oldChildren[x];
				if (oldChild != null && oldChild.type === type && oldChild.key == key) {
					match = x;
					break;
				}
				x--;
			}
			if (y < oldChildren.length) {
				oldChild = oldChildren[y];
				if (oldChild != null && oldChild.type === type && oldChild.key == key) {
					match = y;
					break;
				}
				y++;
			} else if (x < 0) {
				break;
			}
		}
	}

	return match;
}

/**
 * @param {import('../internal').Internal} internal
 * @param {import('../internal').PreactNode} nextSibling
 * @param {import('../internal').PreactNode} parentDom
 */
export function insertComponentDom(internal, nextSibling, parentDom) {
	if (internal._children == null) {
		return;
	}

	for (let i = 0; i < internal._children.length; i++) {
		let childInternal = internal._children[i];
		if (childInternal) {
			childInternal._parent = internal;

			if (childInternal.flags & TYPE_COMPONENT) {
				insertComponentDom(childInternal, nextSibling, parentDom);
			} else if (childInternal._dom != nextSibling) {
				parentDom.insertBefore(childInternal._dom, nextSibling);
			}
		}
	}
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
