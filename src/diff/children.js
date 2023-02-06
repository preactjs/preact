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
/** @typedef {import('../internal').PreactElement} PreactElement */
/** @typedef {import('../internal').ComponentChildren} ComponentChildren */

/**
 * Update an internal with new children.
 * @param {Internal} parentInternal The internal whose children should be patched
 * @param {ComponentChildren[]} children The new children, represented as VNodes
 * @param {PreactElement} parentDom The element into which this subtree is rendered
 */
export function patchChildren(parentInternal, children, parentDom) {
	// Step 1. Find matches and set up _prev pointers. Identity null placeholders
	// by also walking the old internal children at the same time
	let prevInternal = findMatches(parentInternal, children);

	// Step 2. Walk over the unused children and unmount:
	unmountUnusedChildren(parentInternal);

	// Step 3. Find the longest decreasing subsequence
	// TODO: Check prevInternal exits before running (aka we are unmounting everything);
	// TODO: Ideally only run this if something has moved
	// TODO: Replace _prevLDS with _next. Doing this will make _next meaningless for a moment
	// TODO: Explore trying to do this without an array, maybe next pointers? Or maybe reuse the array
	runLDS(prevInternal, parentInternal, parentDom);

	// Step 5. Walk backwards over the newly-assigned _prev properties, visiting
	// each Internal to set its _next ptr and perform insert/mount/update.
	insertionLoop(prevInternal, children, parentDom, parentInternal);
}

/**
 * @param {Internal} parentInternal
 * @param {ComponentChildren[]} children
 * @returns {Internal}
 */
function findMatches(parentInternal, children) {
	/** @type {Internal} */
	let internal = parentInternal._child;
	/** @type {Internal} */
	let prevInternal;
	let oldHead = internal;

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

				// If this internal is the first unmatched internal, then bump our
				// pointer to the next node so our search will skip over this internal
				if (oldHead == internal) oldHead = oldHead._next;

				internal = internal._next;
			}
			continue;
		}

		let type = null;
		let typeFlag = 0;
		let key;
		/** @type {VNode | string} */
		let normalizedVNode;

		// text VNodes (strings, numbers, bigints, etc):
		if (typeof vnode !== 'object') {
			typeFlag = TYPE_TEXT;
			normalizedVNode = '' + vnode;
		} else {
			// TODO: Investigate avoiding this VNode allocation (and the one below in
			// the call to `patch`) by passing through the raw VNode type and handling
			// nested arrays directly in mount, patch, createInternal, etc.
			normalizedVNode = Array.isArray(vnode)
				? createElement(Fragment, null, vnode)
				: vnode;

			type = normalizedVNode.type;
			typeFlag = typeof type === 'function' ? TYPE_COMPONENT : TYPE_ELEMENT;
			key = normalizedVNode.key;
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
		}

		matchedInternal._prev = prevInternal || parentInternal;
		prevInternal = matchedInternal;

		if (internal && internal._index == index) {
			internal = internal._next;
		}
	}

	return prevInternal;
}

/**
 * @param {Internal} parentInternal
 */
function unmountUnusedChildren(parentInternal) {
	let lastMatchedInternal;
	let oldHead = parentInternal._child;
	while (oldHead) {
		const next = oldHead._next;
		if (oldHead._prev == null) {
			if (lastMatchedInternal) lastMatchedInternal._next = next;
			unmount(oldHead, oldHead, 0);
		} else {
			lastMatchedInternal = oldHead;
		}
		oldHead = next;
	}
}

/**
 * @param {Internal} internal
 * @param {Internal} parentInternal
 * @param {PreactElement} parentDom
 */
function runLDS(internal, parentInternal, parentDom) {
	// let internal = prevInternal;
	/** @type {Internal[]} */
	const wipLDS = [];

	while (internal && internal !== parentInternal) {
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
		if (internal.flags & TYPE_ROOT && internal.props._parentDom !== parentDom) {
			internal = internal._prev;
			continue;
		}

		// Mark all internals as requiring insertion. We will clear this flag for
		// internals on longest decreasing subsequence
		internal.flags |= INSERT_INTERNAL;

		// Skip over newly mounted internals. They will be mounted in place.
		if (internal._index === -1) {
			internal = internal._prev;
			continue;
		}

		if (wipLDS.length == 0) {
			wipLDS.push(internal);
			internal = internal._prev;
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

		internal = internal._prev;
	}

	// Step 4. Mark internals in longest decreasing subsequence
	/** @type {Internal | null} */
	let ldsNode = wipLDS.length ? wipLDS[wipLDS.length - 1] : null;
	while (ldsNode) {
		// This node is on the longest decreasing subsequence so clear INSERT_NODE flag
		ldsNode.flags &= ~INSERT_INTERNAL;
		ldsNode = ldsNode._prevLDS;
	}
}

/**
 * @param {Internal} internal
 * @param {ComponentChildren[]} children
 * @param {PreactElement} parentDom
 * @param {Internal} parentInternal
 */
function insertionLoop(internal, children, parentDom, parentInternal) {
	/** @type {Internal} */
	let nextInternal = null;
	let firstChild = null;

	let index = children.length;
	// internal = prevInternal;
	let prevInternal = internal;
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
		} else if (
			(internal.flags & (MODE_HYDRATE | MODE_SUSPENDED)) ===
			(MODE_HYDRATE | MODE_SUSPENDED)
		) {
			mount(internal, parentDom, internal.data);
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
