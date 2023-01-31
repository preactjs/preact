import { applyRef } from './refs';
import { createElement, Fragment, normalizeToVNode } from '../create-element';
import {
	TYPE_COMPONENT,
	TYPE_TEXT,
	MODE_HYDRATE,
	MODE_SUSPENDED,
	EMPTY_ARR,
	TYPE_DOM,
	UNDEFINED,
	TYPE_ELEMENT,
	INSERT_INTERNAL,
	TYPE_ROOT,
	MODE_UNMOUNTING
} from '../constants';
import { mount } from './mount';
import { patch } from './patch';
import { unmount } from './unmount';
import { createInternal, getDomSibling } from '../tree';

/**
 * Scenarios:
 *
 * 1. Unchanged:  no ordering changes, walk new+old children and update Internals in-place
 * 2. All removed:  walk old child Internals and unmount
 * 3. All added:  walk over new child vnodes and create Internals, assign `.next`, mount
 */

/** @typedef {import('../internal').Internal} Internal */
/** @typedef {import('../internal').VNode} VNode */

/**
 * Update an internal with new children.
 * @param {Internal} parentInternal The internal whose children should be patched
 * @param {import('../internal').ComponentChildren[]} children The new children, represented as VNodes
 * @param {import('../internal').PreactElement} parentDom The element into which this subtree is rendered
 */
export function patchChildren(parentInternal, children, parentDom) {
	/** @type {Internal} */
	let internal = parentInternal._child;
	/** @type {Internal} */
	let prevInternal;
	// let newTail;
	let oldHead = internal;
	// let skewedOldHead = oldHead;

	// Step 1. Find matches and set up _prev pointers. Identity null placeholders
	// by also walking the old internal children at the same time
	for (let index = 0; index < children.length; index++) {
		const vnode = children[index];

		// holes get accounted for in the index property:
		if (vnode == null || vnode === true || vnode === false) {
			if (internal && index == internal._index && internal.key == null) {
				// The current internal is unkeyed, has the same index as this VNode
				// child, and the VNode is now null. So we'll unmount the Internal and
				// treat this slot in the children array as a null placeholder. We mark
				// this node as unmounting to prevent it from being used in future
				// searches for matching internals
				internal.flags |= MODE_UNMOUNTING;
				internal = internal._next;
			}
			continue;
		}

		let type = null;
		let typeFlag = 0;
		let key;
		let normalizedVNode = /** @type {VNode | string} */ (vnode);

		// text VNodes (strings, numbers, bigints, etc):
		if (typeof vnode !== 'object') {
			typeFlag = TYPE_TEXT;
			normalizedVNode += '';
		} else {
			const isArray = Array.isArray(vnode);
			type = isArray ? Fragment : vnode.type;
			typeFlag = typeof type === 'function' ? TYPE_COMPONENT : TYPE_ELEMENT;
			key = isArray ? null : vnode.key;
		}

		/** @type {Internal?} */
		let matchedInternal;

		// TODO: See if doing a fast path (special if condition) for already in
		// place matches is faster than while loop
		if (key == null && internal && index < internal._index) {
			// If we are doing an unkeyed diff, and the old index of the current
			// internal is greater than the current VNode index, then this vnode
			// represents a new element that is mounting into what was previous a null
			// placeholder slot. We should create a new internal to mount this VNode.
		} else {
			// seek forward through the Internals list, starting at the head (either first, or first unused).
			// only match unused items, which are internals where _prev === undefined.
			// note: _prev=null for the first matched internal, and should be considered "used".
			let search = oldHead;
			while (search) {
				const flags = search.flags;
				const isUnused =
					search._prev == null && ~search.flags & MODE_UNMOUNTING;
				if (
					isUnused &&
					(flags & typeFlag) !== 0 &&
					search.type === type &&
					search.key == key
				) {
					matchedInternal = search;
					// if the match was the first unused item, bump the start ptr forward:
					if (search === oldHead) oldHead = oldHead._next;
					break;
				}
				search = search._next;
			}
		}

		// no match, create a new Internal:
		if (!matchedInternal) {
			matchedInternal = createInternal(normalizedVNode, parentInternal);
			// console.log('creating new', internal.type);
		} else {
			// console.log('updating', internal.type);
			// patch(internal, vnode, parentDom);
		}

		matchedInternal._prev = prevInternal || parentInternal;
		prevInternal = matchedInternal;

		if (internal && internal._index == index) {
			internal = internal._next;
		}
	}

	// Step 2. Walk over the unused children and unmount:
	let lastMatchedInternal;
	oldHead = parentInternal._child;
	while (oldHead) {
		const next = oldHead._next;
		if (oldHead._prev == null) {
			if (lastMatchedInternal) lastMatchedInternal._next = next;
			// else parentInternal._child = next;
			unmount(oldHead, oldHead, 0);
		} else {
			lastMatchedInternal = oldHead;
		}
		oldHead = next;
	}

	// Step 3. Find the longest decreasing subsequence
	// TODO: Move this into it's own function
	// TODO: Check prevInternal exits before running (aka we are unmounting everything);
	// TODO: Ideally only run this if something has moved
	// TODO: Replace _prevLDS with _next. Doing this will make _next meaningless for a moment
	// TODO: Explore trying to do this without an array, maybe next pointers? Or maybe reuse the array
	internal = prevInternal;
	if (internal) {
		// TODO: Argh, we need to skip this first internal if it is a TYPE_ROOT node with a different parentDOM :/
		/** @type {Internal[]} */
		const wipLDS = [internal];
		internal.flags |= INSERT_INTERNAL;

		while ((internal = internal._prev) !== parentInternal) {
			// Skip over Root nodes whose parentDOM is different from the current
			// parentDOM (aka Portals). Don't mark them for insertion since the
			// recursive calls to mountChildren/patchChildren will handle
			// mounting/inserting any DOM nodes under the root node.
			//
			// If a root node's parentDOM is the same as the current parentDOM then
			// treat it as an unkeyed fragment and prepare it for moving or insertion
			// if necessary.
			//
			// TODO: Consider the case where a root node has the same parent, goes
			// into a different parent, a new node is inserted before the portal, and
			// then the portal goes back to the original parent. Do we correctly
			// insert the portal into the right place? Currently yes, because the
			// beginning of patch calls insert whenever parentDom changes. Could we
			// move that logic here?
			//
			// TODO: We do the props._parentDom !== parentDom in a couple places.
			// Could we do this check once and cache the result in a flag?
			if (
				internal.flags & TYPE_ROOT &&
				internal.props._parentDom !== parentDom
			) {
				continue;
			}

			// Mark all internals as requiring insertion. We will clear this flag for
			// internals on longest decreasing subsequence
			internal.flags |= INSERT_INTERNAL;

			// Skip over newly mounted internals. They will be mounted in place.
			if (internal._index === -1) {
				continue;
			}

			let ldsTail = wipLDS[wipLDS.length - 1];
			if (ldsTail._index > internal._index) {
				internal._prevLDS = ldsTail;
				wipLDS.push(internal);
			} else {
				// Search for position in wipLIS where node should go. It should replace
				// the first node where node > wip[i] (though keep in mind, we are
				// iterating over the list backwards). Example:
				// ```
				// wipLIS = [4,3,1], node = 2.
				// Node should replace 1: [4,3,2]
				// ```
				let i = wipLDS.length;
				// TODO: Binary search?
				while (--i >= 0 && wipLDS[i]._index < internal._index) {}

				wipLDS[i + 1] = internal;
				let prevLDS = i < 0 ? null : wipLDS[i];
				internal._prevLDS = prevLDS;
			}
		}

		// Step 4. Mark internals in longest decreasing subsequence
		/** @type {Internal | null} */
		let ldsNode = wipLDS[wipLDS.length - 1];
		while (ldsNode) {
			// This node is on the longest decreasing subsequence so clear INSERT_NODE flag
			ldsNode.flags &= ~INSERT_INTERNAL;
			ldsNode = ldsNode._prevLDS;
		}
	}

	// Step 5. Walk backwards over the newly-assigned _prev properties, visiting
	// each Internal to set its _next ptr and perform insert/mount/update.
	/** @type {Internal} */
	let nextInternal = null;
	let firstChild = null;

	let index = children.length;
	internal = prevInternal;
	while (internal) {
		// set this internal's next ptr to the previous loop entry
		internal._next = nextInternal;
		nextInternal = internal;

		let vnode = children[--index];
		while (vnode == null || vnode === true || vnode === false) {
			vnode = children[--index];
		}

		prevInternal = internal._prev;

		// for now, we're only using double-links internally to this function:
		internal._prev = internal._prevLDS = null;

		if (prevInternal === parentInternal) prevInternal = undefined;

		if (internal._index === -1) {
			mount(internal, parentDom, getDomSibling(internal));
			if (internal.flags & TYPE_DOM) {
				// If we are mounting a component, it's DOM children will get inserted
				// into the DOM in mountChildren. If we are mounting a DOM node, then
				// it's children will be mounted into itself and we need to insert this
				// DOM in place.
				insert(internal, parentDom);
			}
		} else {
			patch(
				internal,
				Array.isArray(vnode) ? createElement(Fragment, null, vnode) : vnode,
				parentDom
			);
			if (internal.flags & INSERT_INTERNAL) {
				insert(internal, parentDom);
			}
		}

		if (!prevInternal) firstChild = internal;

		internal.flags &= ~INSERT_INTERNAL;

		let oldRef = internal._prevRef;
		if (internal.ref != oldRef) {
			if (oldRef) applyRef(oldRef, null, internal);
			if (internal.ref)
				applyRef(internal.ref, internal._component || internal.data, internal);
		}

		// TODO: this index should match the index of the matching vnode. So any
		// skipping over of non-renderables should move this index accordingly.
		// Doing this should help with null placeholders and enable us to skip the
		// LIS algorithm for situations like `{condition && <div />}`
		internal._index = index;
		internal = prevInternal;
	}

	parentInternal._child = firstChild;
}
/*
export function patchChildren(internal, children, parentDom) {
	// let oldChildren =
	// 	(internal._children && internal._children.slice()) || EMPTY_ARR;

	// let oldChildrenLength = oldChildren.length;
	// let remainingOldChildren = oldChildrenLength;


	let skew = 0;
	let i;

	/** @type {import('../internal').Internal} *\/
	let childInternal;

	/** @type {import('../internal').ComponentChild} *\/
	let childVNode;

	/** @type {import('../internal').Internal[]} *\/
	const newChildren = [];

	for (i = 0; i < children.length; i++) {
		childVNode = normalizeToVNode(children[i]);

		// Terser removes the `continue` here and wraps the loop body
		// in a `if (childVNode) { ... } condition
		if (childVNode == null) {
			// newChildren[i] = null;
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
			mount(
				childInternal,
				childVNode,
				parentDom,
				getDomSibling(internal, skewedIndex)
			);
		}
		// If this node suspended during hydration, and no other flags are set:
		// @TODO: might be better to explicitly check for MODE_ERRORED here.
		else if (
			(childInternal.flags & (MODE_HYDRATE | MODE_SUSPENDED)) ===
			(MODE_HYDRATE | MODE_SUSPENDED)
		) {
			// We are resuming the hydration of a VNode
			mount(childInternal, childVNode, parentDom, childInternal.data);
		} else {
			// Morph the old element into the new one, but don't append it to the dom yet
			patch(childInternal, childVNode, parentDom);
		}

		go: if (mountingChild) {
			if (matchingIndex == -1) {
				skew--;
			}

			// Perform insert of new dom
			if (childInternal.flags & TYPE_DOM) {
				parentDom.insertBefore(
					childInternal.data,
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
				parentDom.insertBefore(childInternal.data, nextSibling);
			} else {
				insertComponentDom(childInternal, nextSibling, parentDom);
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
						childInternal._component || childInternal.data,
						childInternal
					);
			}
		}
	}
}
*/

/**
 * @param {import('../internal').VNode | string} childVNode
 * @param {import('../internal').Internal[]} oldChildren
 * @param {number} skewedIndex
 * @param {number} remainingOldChildren
 * @returns {number}
 */
/*
function findMatchingIndex(
	childVNode,
	oldChildren,
	skewedIndex,
	remainingOldChildren
) {
	const type = typeof childVNode == 'string' ? null : childVNode.type;
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
*/

/**
 * @param {import('../internal').Internal} internal
 * @param {import('../internal').PreactNode} parentDom
 * @param {import('../internal').PreactNode} [nextSibling]
 */
export function insert(internal, parentDom, nextSibling) {
	if (nextSibling === undefined) {
		nextSibling = getDomSibling(internal);
	}

	if (internal.flags & TYPE_COMPONENT) {
		let child = internal._child;
		while (child) {
			insert(child, parentDom, nextSibling);
			child = child._next;
		}
	} else if (internal.data != nextSibling) {
		// @ts-ignore .data is a Node
		parentDom.insertBefore(internal.data, nextSibling);
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
