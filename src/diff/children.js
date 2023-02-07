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
	TYPE_ROOT
} from '../constants';
import { mount } from './mount';
import { patch } from './patch';
import { unmount } from './unmount';
import { createInternal, getDomSibling, getFirstDom } from '../tree';

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
 * @param {PreactElement} boundaryNode The DOM element that all children of this internal
 * should be inserted before, i.e. the DOM boundary or edge of this Internal, a.k.a. the next DOM sibling of
 * this internal
 */
export function patchChildren(
	parentInternal,
	children,
	parentDom,
	boundaryNode
) {
	// Step 1. Find matches and set up _next pointers. All unused internals are at
	// attached to oldHead.
	//
	// In this step, _tempNext will hold the old next pointer for an internal.
	// This algorithm changes `_next` when finding matching internals. This change
	// breaks our null placeholder detection logic which compares the old internal
	// at a particular index with the new VNode at that index. By using
	// `_tempNext` to hold the old next pointers we are able to simultaneously
	// iterate over the new VNodes, iterate over the old Internal list, and update
	// _next pointers to the new Internals.
	let moved = findMatches(parentInternal._child, children, parentInternal);

	// Step 3. Find the longest increasing subsequence
	//
	// In this step, `_tempNext` will hold the previous Internal in the longest
	// increasing subsequence containing the current Internal.
	//
	// - [ ] TODO: Explore trying to do this without an array, maybe next
	//   pointers? Or maybe reuse the array
	let lisHead = null;
	if (parentInternal._child && moved) {
		lisHead = runLIS(parentInternal._child, parentDom);
	}

	// Step 5. Walk forwards over the newly-assigned _next properties, inserting
	// Internals that require insertion. We track the next dom sibling Internals
	// should be inserted before by walking over the LIS (using _tempNext) at the
	// same time
	if (parentInternal._child) {
		insertionLoop(
			parentInternal._child,
			children,
			parentDom,
			boundaryNode,
			lisHead
		);
	}
}

/**
 * @param {Internal} internal
 * @param {ComponentChildren[]} children
 * @param {Internal} parentInternal
 * @returns {boolean}
 */
function findMatches(internal, children, parentInternal) {
	let moved = false;

	/** @type {Internal} */
	// let internal = parentInternal._child;
	parentInternal._child = null;

	/** @type {Internal} The start of the list of unmatched Internals */
	let oldHead = internal;

	/** @type {Internal} The last matched internal */
	let prevMatchedInternal;

	/**
	 * @type {Internal} The previously searched internal, aka the old previous
	 * Internal of prevMatchedInternal. We store this outside of the loop so we
	 * can begin our search with prevMatchedInternal._next and have a previous
	 * Internal to update if prevMatchedInternal._next matches. In other words, it
	 * allows us to resume our search in the middle of the list of unused
	 * Internals. We initialize it to oldHead since the first time we enter the
	 * search loop, we just attempted to match oldHead so oldHead is the previous
	 * search.
	 */
	let prevSearch = oldHead;

	for (let index = 0; index < children.length; index++) {
		const vnode = children[index];

		// holes get accounted for in the index property:
		if (vnode == null || vnode === true || vnode === false) {
			if (internal && index == internal._index && internal.key == null) {
				// The current internal is unkeyed, has the same index as this VNode
				// child, and the VNode is now null. So we'll unmount the Internal and
				// treat this slot in the children array as a null placeholder. We'll
				// eagerly unmount this node to prevent it from being used in future
				// searches for matching internals
				unmount(internal, internal, 0);

				// If this internal is the first unmatched internal, then bump our
				// pointer to the next node so our search will skip over this internal.
				//
				// TODO: What if this node is not the first unmatched Internal (and so
				// remains in the search array) and shares the type with another
				// Internal that is it matches? Do we have a test for this?
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

		if (key == null && internal && index < internal._index) {
			// If we are doing an unkeyed diff, and the old index of the current
			// internal in the old list of children is greater than the current VNode
			// index, then this vnode represents a new element that is mounting into
			// what was previous a null placeholder slot. We should create a new
			// internal to mount this VNode.
		} else if (
			oldHead &&
			(oldHead.flags & typeFlag) !== 0 &&
			oldHead.type === type &&
			oldHead.key == key
		) {
			// Fast path checking if this current vnode matches the first unused
			// Internal. By doing this we can avoid the search loop and setting the
			// move flag, which allows us to skip the LDS algorithm if no Internals
			// moved
			matchedInternal = oldHead;
			oldHead = oldHead._next;
		} else if (oldHead) {
			// We need to search for a matching internal for this VNode. We'll start
			// at the first unmatched Internal and search all of its siblings. When we
			// find a match, we'll remove it from the list of unmatched Internals and
			// add to the new list of children internals, whose tail is
			// prevMatchedInternal
			//
			// TODO: Measure if starting search from prevMatchedInternal._next is worth it.
			// Let's start our search at the node where our previous match left off.
			// We do this to optimize for the more common case of holes over keyed
			// shuffles
			let searchStart;
			if (
				prevMatchedInternal &&
				prevMatchedInternal._next &&
				prevMatchedInternal._next !== oldHead
			) {
				searchStart = prevMatchedInternal._next;
			} else {
				searchStart = oldHead._next;
				prevSearch = oldHead;
			}

			/** @type {Internal} */
			let search = searchStart;

			while (search) {
				const flags = search.flags;

				// Match found!
				if (flags & typeFlag && search.type === type && search.key == key) {
					moved = true;
					matchedInternal = search;

					// Let's update our list of unmatched nodes to remove the new matchedInternal.
					// TODO: Better explain this: Temporarily keep the old next pointer
					// around for tracking null placeholders. Particularly examine the
					// test "should support moving Fragments between beginning and end"
					prevSearch._tempNext = prevSearch._next;
					prevSearch._next = matchedInternal._next;

					break;
				}

				// No match found. Let's move our pointers to the next node in our
				// search.
				prevSearch = search;

				// If our current node we are searching has a _next node, then let's
				// continue from there. If it doesn't, let's loop back around to the
				// start of the list of unmatched nodes (i.e. oldHead).
				search = search._next ? search._next : oldHead._next;
				if (search === searchStart) {
					// However, it's possible that oldHead was the start of our search. If
					// so, we can stop searching. No match was found.
					break;
				}
			}
		}

		// No match, create a new Internal:
		if (!matchedInternal) {
			matchedInternal = createInternal(normalizedVNode, parentInternal);
		}

		// Put matched or new internal into the new list of children
		if (prevMatchedInternal) prevMatchedInternal._next = matchedInternal;
		else parentInternal._child = matchedInternal;
		prevMatchedInternal = matchedInternal;

		if (internal && internal._index == index) {
			// Move forward our tracker for null placeholders
			internal = internal._tempNext || internal._next;
		}
	}

	// Ensure the last node of the last matched internal has a null _next pointer.
	// Its possible that it still points to it's old sibling at the end of Step 1,
	// so we'll manually clear it here.
	if (prevMatchedInternal) prevMatchedInternal._next = null;

	// Step 2. Walk over the unused children and unmount:
	unmountUnusedChildren(oldHead);

	return moved;
}

/**
 * @param {Internal} internal
 */
function unmountUnusedChildren(internal) {
	while (internal) {
		unmount(internal, internal, 0);
		internal = internal._next;
	}
}

/**
 * @param {Internal} internal
 * @param {PreactElement} parentDom
 * @returns {Internal}
 */
function runLIS(internal, parentDom) {
	// let internal = prevInternal;
	/** @type {Internal[]} */
	const wipLIS = [];

	while (internal) {
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
			internal = internal._next;
			continue;
		}

		// Mark all internals as requiring insertion. We will clear this flag for
		// internals on longest decreasing subsequence
		internal.flags |= INSERT_INTERNAL;

		// Skip over newly mounted internals. They will be mounted in place.
		if (internal._index === -1) {
			internal = internal._next;
			continue;
		}

		if (wipLIS.length == 0) {
			wipLIS.push(internal);
			internal = internal._next;
			continue;
		}

		let ldsTail = wipLIS[wipLIS.length - 1];
		if (ldsTail._index < internal._index) {
			internal._tempNext = ldsTail;
			wipLIS.push(internal);
		} else {
			// Search for position in wipLIS where node should go. It should replace
			// the first node where node > wip[i] (though keep in mind, we are
			// iterating over the list backwards). Example:
			// ```
			// wipLIS = [4,3,1], node = 2.
			// Node should replace 1: [4,3,2]
			// ```
			let i = wipLIS.length;
			// TODO: Binary search?
			while (--i >= 0 && wipLIS[i]._index > internal._index) {}

			wipLIS[i + 1] = internal;
			let prevLIS = i < 0 ? null : wipLIS[i];
			internal._tempNext = prevLIS;
		}

		internal = internal._next;
	}

	// Step 4. Mark internals in longest increasing subsequence and reverse the
	// the longest increasing subsequence linked list. Before this step, _tempNext
	// is actual the **previous** Internal in the longest increasing subsequence.
	//
	// After this step, _tempNext becomes the **next** Internal in the longest
	// increasing subsequence.
	/** @type {Internal | null} */
	let lisNode = wipLIS.length ? wipLIS[wipLIS.length - 1] : null;
	let lisHead = lisNode;
	let nextLIS = null;
	while (lisNode) {
		// This node is on the longest decreasing subsequence so clear INSERT_NODE flag
		lisNode.flags &= ~INSERT_INTERNAL;

		// Reverse the _tempNext LIS linked list
		internal = lisNode._tempNext;
		lisNode._tempNext = nextLIS;
		nextLIS = lisNode;
		lisNode = internal;

		// Track the head of the linked list
		if (lisNode) lisHead = lisNode;
	}

	return lisHead;
}

/**
 * @param {Internal} internal
 * @param {ComponentChildren[]} children
 * @param {PreactElement} parentDom
 * @param {PreactElement} boundaryNode
 * @param {Internal} lisHead
 */
function insertionLoop(internal, children, parentDom, boundaryNode, lisHead) {
	/** @type {Internal} The next in-place Internal whose DOM previous Internals should be inserted before */
	let lisNode = lisHead;
	/** @type {PreactElement} The DOM element of the next LIS internal */
	let nextDomSibling;
	if (lisHead) {
		// If lisHead is non-null, then we have a LIS sequence of in-place Internal
		// we can use to determine our next DOM sibling
		nextDomSibling =
			lisNode.flags & TYPE_DOM ? lisNode.data : getFirstDom(lisNode._child);
	} else {
		nextDomSibling = getDomSibling(internal) || boundaryNode;
	}

	let index = 0;
	while (internal) {
		let vnode = children[index];
		while (vnode == null || vnode === true || vnode === false) {
			vnode = children[++index];
		}

		if (lisHead) {
			// If lisHead is non-null, then we have a LIS sequence of in-place
			// Internal we can use to determine our next DOM sibling. If this internal
			// is the current internal in our LIS in-place sequence, then let's go to
			// the next Internal in the sequence and use it's DOM node as our new
			// nextSibling
			if (internal === lisNode) {
				lisNode = lisNode._tempNext;
				if (lisNode) {
					nextDomSibling =
						lisNode.flags & TYPE_DOM
							? lisNode.data
							: getFirstDom(lisNode._child);
				} else {
					nextDomSibling = boundaryNode;
				}
			}
		} else {
			// We may not have an LIS sequence if nothing moved. If so, we'll need to
			// manually compute the next dom sibling in case any children below us do
			// insertions before it.
			nextDomSibling = getDomSibling(internal) || boundaryNode;
		}

		if (internal._index === -1) {
			mount(internal, parentDom, nextDomSibling);
			if (internal.flags & TYPE_DOM) {
				// If we are mounting a component, it's DOM children will get inserted
				// into the DOM in mountChildren. If we are mounting a DOM node, then
				// it's children will be mounted into itself and we need to insert this
				// DOM in place.
				insert(internal, parentDom, nextDomSibling);
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
				parentDom,
				nextDomSibling
			);
			if (internal.flags & INSERT_INTERNAL) {
				insert(internal, parentDom, nextDomSibling);
			}
		}

		let oldRef = internal._prevRef;
		if (internal.ref != oldRef) {
			if (oldRef) applyRef(oldRef, null, internal);
			if (internal.ref)
				applyRef(internal.ref, internal._component || internal.data, internal);
		}

		internal.flags &= ~INSERT_INTERNAL;
		internal._tempNext = null;
		internal._index = index++;
		internal = internal._next;
	}
}

/**
 * @param {import('../internal').Internal} internal
 * @param {import('../internal').PreactNode} parentDom
 * @param {import('../internal').PreactNode} nextSibling
 */
export function insert(internal, parentDom, nextSibling) {
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
