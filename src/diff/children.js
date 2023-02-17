import { applyRef } from './refs';
import { createElement, Fragment } from '../create-element';
import {
	TYPE_COMPONENT,
	TYPE_TEXT,
	MODE_HYDRATE,
	MODE_SUSPENDED,
	TYPE_DOM,
	TYPE_ELEMENT,
	INSERT_INTERNAL
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
	findMatches(parentInternal._child, children, parentInternal);

	// Step 5. Walk forwards over the newly-assigned _next properties, inserting
	// Internals that require insertion. We track the next dom sibling Internals
	// should be inserted before by walking over the LIS (using _tempNext) at the
	// same time
	if (parentInternal._child) {
		insertionLoop(parentInternal._child, children, parentDom);
	}
}

/**
 * @param {Internal | null} internal
 * @param {ComponentChildren[]} children
 * @param {Internal} parentInternal
 */
function findMatches(internal, children, parentInternal) {
	/** @type {Internal} */
	parentInternal._child = null;

	/** @type {Internal | null} The start of the list of unmatched Internals */
	let oldHead = internal;

	/** @type {Internal | undefined} The last matched internal */
	let prevMatchedInternal;

	/** @type {Map<any, Internal | Internal[]> | undefined} */
	let keyMap;

	/** @type {number} Tracks the index of the last Internal we decided was "in-place" and did not need insertion */
	let lastPlacedIndex = 0;

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

		/** @type {Internal | undefined} */
		let matchedInternal;

		if (key == null && internal && index < internal._index) {
			// If we are doing an unkeyed diff, and the old index of the current
			// internal in the old list of children is greater than the current VNode
			// index, then this vnode represents a new element that is mounting into
			// what was previous a null placeholder slot. We should create a new
			// internal to mount this VNode.
		} else if (
			!keyMap &&
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
			/* Keyed search */
			/** @type {Internal} */
			let search;
			if (!keyMap) {
				keyMap = new Map();
				search = oldHead;
				while (search) {
					if (search.key) {
						keyMap.set(search.key, search);
					} else if (!keyMap.has(search.type)) {
						keyMap.set(search.type, [search]);
					} else {
						keyMap.get(search.type).push(search);
					}
					search = search._next;
				}
			}
			if (key == null) {
				search = keyMap.get(type);
				if (search && search.length) {
					matchedInternal = search.shift();
				}
			} else {
				search = keyMap.get(key);
				if (search && search.type == type) {
					keyMap.delete(key);
					matchedInternal = search;
				}
			}
		}

		// No match, create a new Internal:
		if (!matchedInternal) {
			matchedInternal = createInternal(normalizedVNode, parentInternal);
		} else if (matchedInternal._index < lastPlacedIndex) {
			// If the matched internal has moved such that it is now after the last
			// internal we determined was "in-place", mark it for insertion to move it
			// into the correct place
			matchedInternal.flags |= INSERT_INTERNAL;
		} else {
			// If the matched internal's oldIndex is greater the index of the last
			// internal we determined was "in-place", make this internal the new
			// "in-place" internal. Doing this (only moving the index forward when
			// matching internals old index is grater) better accommodates more
			// scenarios such as unmounting Internals at the beginning and middle of
			// lists
			lastPlacedIndex = matchedInternal._index;
		}

		// Put matched or new internal into the new list of children
		if (prevMatchedInternal) prevMatchedInternal._next = matchedInternal;
		else parentInternal._child = matchedInternal;
		prevMatchedInternal = matchedInternal;

		// TODO: Consider detecting if an internal is of TYPE_ROOT, whether or not
		// it is a PORTAL, and setting a flag as such to use in getDomSibling and
		// getFirstDom

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
	// unmountUnusedChildren(oldHead);
	if (keyMap) {
		unmountUnusedKeyedChildren(keyMap);
	} else if (oldHead) {
		unmountUnusedChildren(oldHead);
	}
}

/**
 * @param {Map<any, Internal | Internal[]>} keyMap
 */
function unmountUnusedKeyedChildren(keyMap) {
	for (let internal of keyMap.values()) {
		if (Array.isArray(internal)) {
			for (let i of internal) {
				unmount(i, i, 0);
			}
		} else {
			unmount(internal, internal, 0);
		}
	}
}

/**
 * @param {Internal | null} internal
 */
function unmountUnusedChildren(internal) {
	while (internal) {
		unmount(internal, internal, 0);
		internal = internal._next;
	}
}

/**
 * @param {Internal | null} internal
 * @param {ComponentChildren[]} children
 * @param {PreactElement} parentDom
 */
function insertionLoop(internal, children, parentDom) {
	let index = 0;
	while (internal) {
		let vnode = children[index];
		while (vnode == null || vnode === true || vnode === false) {
			vnode = children[++index];
		}

		if (internal._index === -1) {
			let nextDomSibling = getDomSibling(internal);
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
				parentDom
			);
			if (internal.flags & INSERT_INTERNAL) {
				insert(internal, parentDom, getDomSibling(internal));
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
