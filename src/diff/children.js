import { applyRef } from './refs';
import { normalizeToVNode } from '../create-element';
import {
	TYPE_COMPONENT,
	TYPE_TEXT,
	MODE_HYDRATE,
	MODE_SUSPENDED,
	EMPTY_ARR,
	TYPE_DOM,
	UNDEFINED,
	TYPE_ELEMENT
} from '../constants';
import { mount } from './mount';
import { patch } from './patch';
import { unmount } from './unmount';
import { createInternal, getChildDom, getDomSibling } from '../tree';

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
 * @param {import('../internal').ComponentChild[]} children The new children, represented as VNodes
 * @param {import('../internal').PreactElement} parentDom The element into which this subtree is rendered
 */
export function patchChildren(parentInternal, children, parentDom) {
	/** @type {Internal} */
	let prevInternal;
	// let newTail;
	let oldHead = parentInternal._child;
	// let skewedOldHead = oldHead;

	for (let index = 0; index < children.length; index++) {
		const vnode = children[index];

		// holes get accounted for in the index property:
		if (vnode == null || vnode === true || vnode === false) continue;

		let type = null;
		let typeFlag = 0;
		let key;
		let normalizedVNode = /** @type {VNode | string} */ (vnode);

		// text VNodes (strings, numbers, bigints, etc):
		if (typeof vnode !== 'object') {
			typeFlag = TYPE_TEXT;
			normalizedVNode += '';
		} else {
			type = vnode.type;
			typeFlag = typeof type === 'function' ? TYPE_COMPONENT : TYPE_ELEMENT;
			key = vnode.key;
		}

		/** @type {Internal?} */
		let internal;

		/*
		// seek forward through the unsorted Internals list, starting at the skewed head.
		// if we reach the end of the list, wrap around until we hit the skewed head again.
		let match = skewedOldHead;
		/** @type {Internal?} *\/
		let prevMatch;

		while (match) {
			const flags = match.flags;
			// next Internal (wrapping around to start):
			let next = match._next || oldHead;
			if (next === match) next = undefined;

			if ((flags & typeFlag) !== 0 && match.type === type && match.key == key) {
				internal = match;

				// update ptr from prev item to remove the match, but don't create a circular tail:
				if (prevMatch) prevMatch._next = match._next;
				else skewedOldHead = next;

				// if we are at the old head, bump it forward and reset skew:
				// if (match === oldHead) oldHead = skewedOldHead = next;
				if (match === oldHead) oldHead = match._next;
				// otherwise just bump the skewed head:
				// else skewedOldHead = next;

				break;
			}

			// we've visited all candidates, bail out (no match):
			if (next === skewedOldHead) break;

			// advance forward one or wrap around:
			prevMatch = match;
			match = next;
		}
		*/

		// seek forward through the Internals list, starting at the head (either first, or first unused).
		// only match unused items, which are internals where _prev === undefined.
		// note: _prev=null for the first matched internal, and should be considered "used".
		let match = oldHead;
		while (match) {
			const flags = match.flags;
			const isUnused = match._prev == null;
			if (
				isUnused &&
				(flags & typeFlag) !== 0 &&
				match.type === type &&
				match.key == key
			) {
				internal = match;
				// if the match was the first unused item, bump the start ptr forward:
				if (match === oldHead) oldHead = oldHead._next;
				break;
			}
			match = match._next;
		}

		// no match, create a new Internal:
		if (!internal) {
			internal = createInternal(normalizedVNode, parentInternal);
			console.log('creating new', internal.type);
		} else {
			console.log('updating', internal.type);
			// patch(internal, vnode, parentDom);
		}

		// move into place in new list
		// if (newTail) newTail._next = internal;
		// else parentInternal._child = internal;
		// newTail = internal;
		internal._prev = prevInternal || parentInternal;
		prevInternal = internal;
	}

	// walk over the unused children and unmount:
	let lastMatchedInternal;
	oldHead = parentInternal._child;
	while (oldHead) {
		const next = oldHead._next;
		if (oldHead._prev == null) {
			if (lastMatchedInternal) lastMatchedInternal._next = next;
			// else parentInternal._child = next;
			unmount(oldHead, parentInternal, 0);
		} else {
			lastMatchedInternal = oldHead;
		}
		oldHead = next;
	}

	// next, we walk backwards over the newly-assigned _prev properties,
	// visiting each Internal to set its _next ptr and perform insert/mount/update.
	let internal = prevInternal;
	/** @type {Internal} */
	let nextInternal = null;

	let index = children.length;
	while (internal) {
		let next = internal._next;

		// set this internal's next ptr to the previous loop entry
		internal._next = nextInternal;
		nextInternal = internal;

		index--;

		prevInternal = internal._prev;
		if (prevInternal === parentInternal) prevInternal = undefined;

		// if (next === null) {
		if (internal.data == null) {
			console.log('mount', internal.type);
			mount(internal, parentDom, getDomSibling(internal));
			insert(internal, parentDom);
			if (prevInternal) prevInternal._next = internal;
			// prevInternal._next = null;
		} else {
			const vnode = children[index];
			patch(internal, vnode, parentDom);
			// If the previous Internal doesn't point back to us, it means we were moved.
			// if (prevInternal._next !== internal) {
			if (internal._next !== next && internal._next) {
				// move
				console.log('move', internal.type, internal.data.textContent);
				console.log(
					' > expected _next:',
					internal._next && internal._next.type,
					internal._next && internal._next.props
				);
				console.log(' > _next:', next && next.type, next && next.props);
				insert(internal, parentDom, getDomSibling(internal));
				// we moved this node, so unset its previous sibling's next pointer
				// note: this is like doing a splice() out of oldChildren
				internal._prev._next = next; // or set to null?
				// prevInternal._next = internal;
				// internal._prev._next = internal;
			} else {
				console.log('update', internal.type, internal.data.textContent);
				console.log(
					' > expected _next:',
					internal._next && internal._next.type,
					internal._next && internal._next.props
				);
				console.log(' > _next:', next && next.type, next && next.props);
			}
		}

		// if (prevInternal) prevInternal._next = internal;
		// else parentInternal._child = internal;

		// for now, we're only using double-links internally to this function:
		internal._prev = null;
		internal = prevInternal;
	}

	parentInternal._child = internal;

	/*
	let childInternal = parentInternal._child;
	let skew = 0;
	// walk over the now sorted Internal children and insert/mount/update
	for (let index = 0; index < children.length; index++) {
		const vnode = children[index];

		// account for holes by incrementing the index:
		if (vnode == null || vnode === true || vnode === false) continue;

		let prevIndex = childInternal._index + skew;

		childInternal._index = index;
		if (prevIndex === -1) {
			console.log('mounting <' + childInternal.type + '> at index ' + index);
			// insert
			mount(childInternal, parentDom, getDomSibling(childInternal));
			// insert(childInternal, getDomSibling(childInternal), parentDom);
			insert(childInternal, parentDom);
			skew++;
		} else {
			// update (or move+update)
			patch(childInternal, vnode, parentDom);
			// if (prevIndex > index) {
			// 	skew--;
			// }

			let nextDomSibling;
			let siblingSkew = skew;
			let sibling = childInternal._next;
			let siblingIndex = index;
			while (sibling) {
				let prevSiblingIndex = sibling._index + siblingSkew;
				siblingIndex++;
				// if this item is in-place:
				if (prevSiblingIndex === siblingIndex) {
					nextDomSibling = getChildDom(sibling);
					break;
				}
				sibling = sibling._next;
			}
			// while (sibling && (sibling._index + siblingSkew) !== ++siblingIndex) {
			// 	siblingSkew++;
			// }

			// if (prevIndex < index) {
			if (prevIndex !== index) {
				skew++;
				// skew = prevIndex - index;
				console.log(
					'<' + childInternal.type + '> index changed from ',
					prevIndex,
					'to',
					index,
					childInternal.data.textContent
				);
				// move
				insert(childInternal, parentDom, nextDomSibling);
			}
		}

		childInternal = childInternal._next;
	}
	*/

	// // walk over the unused children and unmount:
	// while (oldHead) {
	// 	const next = oldHead._next;
	// 	unmount(oldHead, parentInternal, 0);
	// 	oldHead = next;
	// }
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
