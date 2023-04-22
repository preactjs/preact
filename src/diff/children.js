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
 * @param {Internal} internal The internal whose children should be patched
 * @param {ComponentChildren[]} children The new children, represented as VNodes
 * @param {PreactElement} parentDom The element into which this subtree is rendered
 */
export function patchChildren(internal, children, parentDom) {
	// Find matches and set up _next pointers. Unmount unused/unclaimed Internal
	findMatches(internal._child, children, internal);

	// Walk forwards over the newly-assigned _next properties, inserting Internals
	// that require insertion.
	let index = 0;
	internal = internal._child;
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
		internal._index = index++;
		internal = internal._next;
	}
}

/**
 * @param {Internal | null} internal
 * @param {ComponentChildren[]} children
 * @param {Internal} parentInternal
 */
function findMatches(internal, children, parentInternal) {
	parentInternal._child = null;

	/** @type {Internal | undefined} The last matched internal */
	let prevMatchedInternal;

	/** @type {Map<any, Internal | Internal[]> | undefined} */
	let keyMap;

	/** @type {number} Tracks the index of the last Internal we decided was "in-place" and did not need insertion */
	let lastPlacedIndex = 0;

	for (let index = 0; index < children.length; index++) {
		let vnode = children[index];

		// holes get accounted for in the index property:
		if (
			vnode == null ||
			vnode === true ||
			vnode === false ||
			typeof vnode === 'function'
		) {
			if (internal && index == internal._index && internal.key == null) {
				// The current internal is unkeyed, has the same index as this VNode
				// child, and the VNode is now null. So we'll unmount the Internal and
				// treat this slot in the children array as a null placeholder. We'll
				// eagerly unmount this node to prevent it from being used in future
				// searches for matching internals
				unmount(internal, internal, 0);

				internal = internal._next;
			}
			continue;
		}

		let type = null;
		let typeFlag = 0;
		let key;
		/** @type {Internal | undefined} */
		let matchedInternal;

		// text VNodes (strings, numbers, bigints, etc):
		if (typeof vnode !== 'object') {
			typeFlag = TYPE_TEXT;
			vnode = '' + vnode;
		} else {
			// TODO: Investigate avoiding this VNode allocation (and the one below in
			// the call to `patch`) by passing through the raw VNode type and handling
			// nested arrays directly in mount, patch, createInternal, etc.
			vnode = Array.isArray(vnode)
				? createElement(Fragment, null, vnode)
				: vnode;

			type = vnode.type;
			typeFlag = typeof type === 'function' ? TYPE_COMPONENT : TYPE_ELEMENT;
			key = vnode.key;
		}

		if (key == null && internal && index < internal._index) {
			// If we are doing an unkeyed diff, and the old index of the current
			// internal in the old list of children is greater than the current VNode
			// index, then this vnode represents a new element that is mounting into
			// what was previous a null placeholder slot. We should create a new
			// internal to mount this VNode.
		} else if (
			!keyMap &&
			internal &&
			internal.flags & typeFlag &&
			internal.type === type &&
			internal.key == key
		) {
			// Fast path checking if this current vnode matches the first unused
			// Internal. By doing this we can avoid the search loop and setting the
			// move flag, which allows us to skip the LDS algorithm if no Internals
			// moved
			matchedInternal = internal;
			internal = internal._next;
		} else if (internal) {
			/* Keyed search */
			/** @type {any} */
			let search;
			if (!keyMap) {
				keyMap = buildMap(internal);
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
			matchedInternal = createInternal(vnode, parentInternal);
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
	}

	// Ensure the last node of the last matched internal has a null _next pointer.
	// Its possible that it still points to it's old sibling at the end of this loop,
	// so we'll manually clear it here.
	if (prevMatchedInternal) prevMatchedInternal._next = null;

	// Walk over the unused children and unmount:
	if (keyMap) {
		unmountUnusedKeyedChildren(keyMap);
	} else if (internal) {
		unmountUnusedChildren(internal);
	}
}

/**
 * @param {Internal | null} internal
 * @returns {Map<any, Internal | Internal[]>}
 */
function buildMap(internal) {
	let keyMap = new Map();
	while (internal) {
		if (internal.key) {
			keyMap.set(internal.key, internal);
		} else if (!keyMap.has(internal.type)) {
			keyMap.set(internal.type, [internal]);
		} else {
			keyMap.get(internal.type).push(internal);
		}
		internal = internal._next;
	}

	return keyMap;
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
