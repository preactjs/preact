import { diff, unmount, applyRef } from './index';
import { createVNode, Fragment } from '../create-element';
import {
	EMPTY_OBJ,
	EMPTY_ARR,
	INSERT_VNODE,
	MATCHED,
	UNDEFINED,
	NULL,
	HAS_MOVE_BEFORE_SUPPORT
} from '../constants';
import { isArray } from '../util';
import { getDomSibling } from '../component';

/**
 * @typedef {import('../internal').ComponentChildren} ComponentChildren
 * @typedef {import('../internal').Component} Component
 * @typedef {import('../internal').PreactElement} PreactElement
 * @typedef {import('../internal').VNode} VNode
 */

/**
 * Diff the children of a virtual node
 * @param {PreactElement} parentDom The DOM element whose children are being
 * diffed
 * @param {ComponentChildren[]} renderResult
 * @param {VNode} newParentVNode The new virtual node whose children should be
 * diff'ed against oldParentVNode
 * @param {VNode} oldParentVNode The old virtual node whose children should be
 * diff'ed against newParentVNode
 * @param {object} globalContext The current context object - modified by
 * getChildContext
 * @param {string} namespace Current namespace of the DOM node (HTML, SVG, or MathML)
 * @param {Array<PreactElement>} excessDomChildren
 * @param {Array<Component>} commitQueue List of components which have callbacks
 * to invoke in commitRoot
 * @param {PreactElement} oldDom The current attached DOM element any new dom
 * elements should be placed around. Likely `null` on first render (except when
 * hydrating). Can be a sibling DOM element when diffing Fragments that have
 * siblings. In most cases, it starts out as `oldChildren[0]._dom`.
 * @param {boolean} isHydrating Whether or not we are in hydration
 * @param {any[]} refQueue an array of elements needed to invoke refs
 * @param {Document} doc The document object to use for creating elements
 * @returns {PreactElement} The next sibling DOM element to insert new elements
 */
export function diffChildren(
	parentDom,
	renderResult,
	newParentVNode,
	oldParentVNode,
	globalContext,
	namespace,
	excessDomChildren,
	commitQueue,
	oldDom,
	isHydrating,
	refQueue,
	doc
) {
	let i,
		/** @type {VNode} */
		oldVNode,
		/** @type {VNode} */
		childVNode,
		/** @type {PreactElement} */
		newDom,
		/** @type {PreactElement} */
		firstChildDom;

	// This is a compression of oldParentVNode!=null && oldParentVNode != EMPTY_OBJ && oldParentVNode._children || EMPTY_ARR
	// as EMPTY_OBJ._children should be `undefined`.
	/** @type {VNode[]} */
	let oldChildren = (oldParentVNode && oldParentVNode._children) || EMPTY_ARR;

	let newChildrenLength = renderResult.length;

	oldDom = constructNewChildrenArray(
		newParentVNode,
		renderResult,
		oldChildren,
		oldDom,
		newChildrenLength
	);

	for (i = 0; i < newChildrenLength; i++) {
		childVNode = newParentVNode._children[i];
		if (childVNode == NULL) continue;

		// At this point, constructNewChildrenArray has assigned _index to be the
		// matchingIndex for this VNode's oldVNode (or -1 if there is no oldVNode).
		oldVNode =
			(childVNode._index != -1 && oldChildren[childVNode._index]) || EMPTY_OBJ;

		// Update childVNode._index to its final index
		childVNode._index = i;

		// Morph the old element into the new one, but don't append it to the dom yet
		let result = diff(
			parentDom,
			childVNode,
			oldVNode,
			globalContext,
			namespace,
			excessDomChildren,
			commitQueue,
			oldDom,
			isHydrating,
			refQueue,
			doc
		);

		// Adjust DOM nodes
		newDom = childVNode._dom;
		if (childVNode.ref && oldVNode.ref != childVNode.ref) {
			if (oldVNode.ref) {
				applyRef(oldVNode.ref, NULL, childVNode);
			}
			refQueue.push(
				childVNode.ref,
				childVNode._component || newDom,
				childVNode
			);
		}

		if (firstChildDom == NULL && newDom != NULL) {
			firstChildDom = newDom;
		}

		let shouldPlace = childVNode._flags & INSERT_VNODE;
		if (shouldPlace || oldVNode._children === childVNode._children) {
			oldDom = insert(
				childVNode,
				oldDom,
				parentDom,
				shouldPlace,
				oldVNode == NULL || oldVNode._original == NULL
			);

			// When a matched VNode is physically moved via INSERT_VNODE, its old
			// _dom pointer becomes a stale positional reference. Clear it so that
			// getDomSibling (called from nested diffs) won't return this stale
			// reference and mis-place subsequent DOM nodes. See #5065.
			if (shouldPlace && oldVNode._dom) {
				oldVNode._dom = NULL;
			}
		} else if (typeof childVNode.type == 'function' && result !== UNDEFINED) {
			oldDom = result;
		} else if (newDom) {
			oldDom = newDom.nextSibling;
		}

		// Unset diffing flags
		childVNode._flags &= ~(INSERT_VNODE | MATCHED);
	}

	newParentVNode._dom = firstChildDom;

	return oldDom;
}

/**
 * @param {VNode} newParentVNode
 * @param {ComponentChildren[]} renderResult
 * @param {VNode[]} oldChildren
 */
function constructNewChildrenArray(
	newParentVNode,
	renderResult,
	oldChildren,
	oldDom,
	newChildrenLength
) {
	/** @type {number} */
	let i;
	/** @type {VNode} */
	let childVNode;
	/** @type {VNode} */
	let oldVNode;

	let oldChildrenLength = oldChildren.length,
		remainingOldChildren = oldChildrenLength;

	let skew = 0;

	/** Whether any matched child was found far from its skewed index, i.e. a
	 * real reorder happened and we need to compute the minimal set of moves. */
	let moved = false;

	newParentVNode._children = new Array(newChildrenLength);
	for (i = 0; i < newChildrenLength; i++) {
		// @ts-expect-error We are reusing the childVNode variable to hold both the
		// pre and post normalized childVNode
		childVNode = renderResult[i];

		if (
			childVNode == NULL ||
			typeof childVNode == 'boolean' ||
			typeof childVNode == 'function'
		) {
			newParentVNode._children[i] = NULL;
			continue;
		}
		// If this newVNode is being reused (e.g. <div>{reuse}{reuse}</div>) in the same diff,
		// or we are rendering a component (e.g. setState) copy the oldVNodes so it can have
		// it's own DOM & etc. pointers
		else if (
			typeof childVNode == 'string' ||
			typeof childVNode == 'number' ||
			// eslint-disable-next-line valid-typeof
			typeof childVNode == 'bigint' ||
			childVNode.constructor == String
		) {
			childVNode = newParentVNode._children[i] = createVNode(
				NULL,
				childVNode,
				NULL,
				NULL,
				NULL
			);
		} else if (isArray(childVNode)) {
			childVNode = newParentVNode._children[i] = createVNode(
				Fragment,
				{ children: childVNode },
				NULL,
				NULL,
				NULL
			);
		} else if (childVNode.constructor === UNDEFINED && childVNode._depth > 0) {
			// VNode is already in use, clone it. This can happen in the following
			// scenario:
			//   const reuse = <div />
			//   <div>{reuse}<span />{reuse}</div>
			childVNode = newParentVNode._children[i] = createVNode(
				childVNode.type,
				childVNode.props,
				childVNode.key,
				childVNode.ref ? childVNode.ref : NULL,
				childVNode._original
			);
		} else {
			newParentVNode._children[i] = childVNode;
		}

		const skewedIndex = i + skew;
		childVNode._parent = newParentVNode;
		childVNode._depth = newParentVNode._depth + 1;

		// Temporarily store the matchingIndex on the _index property so we can pull
		// out the oldVNode in diffChildren. We'll override this to the VNode's
		// final index after using this property to get the oldVNode
		const matchingIndex = (childVNode._index = findMatchingIndex(
			childVNode,
			oldChildren,
			skewedIndex,
			remainingOldChildren
		));

		oldVNode = NULL;
		if (matchingIndex != -1) {
			oldVNode = oldChildren[matchingIndex];
			remainingOldChildren--;
			if (oldVNode) {
				oldVNode._flags |= MATCHED;
			}
		}

		// Here, we define isMounting for the purposes of the skew diffing
		// algorithm. Nodes that are unsuspending are considered mounting and we detect
		// this by checking if oldVNode._original == null
		if (oldVNode == NULL || oldVNode._original == NULL) {
			if (matchingIndex == -1) {
				// When the array of children is growing we need to decrease the skew
				// as we are adding a new element to the array.
				// Example:
				// [1, 2, 3] --> [0, 1, 2, 3]
				// oldChildren   newChildren
				//
				// The new element is at index 0, so our skew is 0,
				// we need to decrease the skew as we are adding a new element.
				// The decrease will cause us to compare the element at position 1
				// with value 1 with the element at position 0 with value 0.
				//
				// A linear concept is applied when the array is shrinking,
				// if the length is unchanged we can assume that no skew
				// changes are needed.
				if (newChildrenLength > oldChildrenLength) {
					skew--;
				} else if (newChildrenLength < oldChildrenLength) {
					skew++;
				}
			}

			// If we are mounting a DOM VNode, mark it for insertion
			if (typeof childVNode.type != 'function') {
				childVNode._flags |= INSERT_VNODE;
			}
		} else {
			// Matched children are candidates for the minimal-move pass below;
			// MATCHED on a _new_ vnode is cleared in diffChildren's placement loop.
			childVNode._flags |= MATCHED;

			// The skew adjustments keep findMatchingIndex's search centered for
			// shift patterns (insertions/removals at the front). A match further
			// than one position away means children were genuinely reordered:
			// flag it so the minimal set of moves is computed below. Off-by-one
			// matches provably keep matched old indices in increasing order, so
			// no moves are needed for them.
			if (matchingIndex == skewedIndex - 1) {
				skew--;
			} else if (matchingIndex == skewedIndex + 1) {
				skew++;
			} else if (matchingIndex != skewedIndex) {
				if (matchingIndex > skewedIndex) {
					skew--;
				} else {
					skew++;
				}

				moved = true;
			}
		}
	}

	if (moved) {
		// Children were reordered: mark the minimal set of matched (MATCHED flag)
		// children for insertion by finding the longest increasing subsequence of
		// old indices (patience sorting). Children on the subsequence stay in
		// place, all others get INSERT_VNODE. `_index` still holds the
		// matchingIndex here.
		/** @type {number[]} tails[x] is the smallest old index ending an increasing subsequence of length x+1 */
		let tails = [];
		/** @type {number[]} length of the longest increasing subsequence ending at child i */
		let lisLengths = [];
		for (i = 0; i < newChildrenLength; i++) {
			childVNode = newParentVNode._children[i];
			if (childVNode && childVNode._flags & MATCHED) {
				// Binary search for the insertion point, keeping the pass at
				// O(n log n) even for pathological reorders.
				let lo = 0,
					hi = tails.length;
				while (lo < hi) {
					const mid = (lo + hi) >> 1;
					if (tails[mid] < childVNode._index) {
						lo = mid + 1;
					} else {
						hi = mid;
					}
				}
				tails[lo] = childVNode._index;
				lisLengths[i] = lo + 1;
			}
		}

		// `skew` is dead after the main loop; reuse it as the remaining
		// subsequence length while walking backwards. Likewise `i` is left at
		// newChildrenLength by the loop above.
		skew = tails.length;
		while (i--) {
			if (lisLengths[i]) {
				if (lisLengths[i] == skew) {
					skew--;
				} else {
					newParentVNode._children[i]._flags |= INSERT_VNODE;
				}
			}
		}
	}

	// Remove remaining oldChildren if there are any. Loop forwards so that as we
	// unmount DOM from the beginning of the oldChildren, we can adjust oldDom to
	// point to the next child, which needs to be the first DOM node that won't be
	// unmounted.
	if (remainingOldChildren) {
		for (i = 0; i < oldChildrenLength; i++) {
			oldVNode = oldChildren[i];
			if (oldVNode != NULL && (oldVNode._flags & MATCHED) == 0) {
				if (oldVNode._dom == oldDom) {
					oldDom = getDomSibling(oldVNode);
				}

				unmount(oldVNode, oldVNode);
			}
		}
	}

	return oldDom;
}

/**
 * @param {VNode} parentVNode
 * @param {PreactElement} oldDom
 * @param {PreactElement} parentDom
 * @param {number} shouldPlace
 * @param {boolean} isMounting
 * @returns {PreactElement}
 */
function insert(parentVNode, oldDom, parentDom, shouldPlace, isMounting) {
	// Note: VNodes in nested suspended trees may be missing _children.
	if (typeof parentVNode.type == 'function') {
		// Root children live in another container, they never move with the
		// host tree and contribute nothing to the host insertion cursor.
		if (parentVNode.props._parentDom) return oldDom;
		let children = parentVNode._children;
		for (let i = 0; children && i < children.length; i++) {
			if (children[i]) {
				// If we enter this code path on sCU bailout, where we copy
				// oldVNode._children to newVNode._children, we need to update the old
				// children's _parent pointer to point to the newVNode (parentVNode
				// here).
				children[i]._parent = parentVNode;
				oldDom = insert(children[i], oldDom, parentDom, shouldPlace, false);
			}
		}

		return oldDom;
	} else if (parentVNode._dom != oldDom) {
		if (shouldPlace) {
			if (oldDom && parentVNode.type && !oldDom.parentNode) {
				oldDom = getDomSibling(parentVNode);
			}

			if (HAS_MOVE_BEFORE_SUPPORT && !isMounting) {
				// @ts-expect-error This isn't added to TypeScript lib.d.ts yet
				parentDom.moveBefore(parentVNode._dom, oldDom);
			} else {
				parentDom.insertBefore(parentVNode._dom, oldDom || NULL);
			}
		}
		oldDom = parentVNode._dom;
	}

	do {
		oldDom = oldDom && oldDom.nextSibling;
	} while (oldDom != NULL && oldDom.nodeType == 8);

	return oldDom;
}

/**
 * Flatten and loop through the children of a virtual node
 * @param {ComponentChildren} children The unflattened children of a virtual
 * node
 * @returns {VNode[]}
 */
export function toChildArray(children, out) {
	out = out || [];
	if (children == NULL || typeof children == 'boolean') {
	} else if (isArray(children)) {
		children.some(child => {
			toChildArray(child, out);
		});
	} else {
		out.push(children);
	}
	return out;
}

/**
 * @param {VNode} childVNode
 * @param {VNode[]} oldChildren
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
	const key = childVNode.key;
	const type = childVNode.type;
	let oldVNode = oldChildren[skewedIndex];
	const matched = oldVNode != NULL && (oldVNode._flags & MATCHED) == 0;

	// We only need to perform a search if there are more children
	// (remainingOldChildren) to search. However, if the oldVNode we just looked
	// at skewedIndex was not already used in this diff, then there must be at
	// least 1 other (so greater than 1) remainingOldChildren to attempt to match
	// against. So the following condition checks that ensuring
	// remainingOldChildren > 1 if the oldVNode is not already used/matched. Else
	// if the oldVNode was null or matched, then there could needs to be at least
	// 1 (aka `remainingOldChildren > 0`) children to find and compare against.
	//
	// If there is an unkeyed functional VNode, that isn't a built-in like our Fragment,
	// we should not search as we risk re-using state of an unrelated VNode. (reverted for now)
	let shouldSearch =
		// (typeof type != 'function' || type === Fragment || key) &&
		remainingOldChildren > (matched ? 1 : 0);

	if (
		(oldVNode === NULL && key == null) ||
		(matched && key == oldVNode.key && type == oldVNode.type)
	) {
		return skewedIndex;
	} else if (shouldSearch) {
		let x = skewedIndex - 1;
		let y = skewedIndex + 1;
		while (x >= 0 || y < oldChildren.length) {
			const childIndex = x >= 0 ? x-- : y++;
			oldVNode = oldChildren[childIndex];
			if (
				oldVNode != NULL &&
				(oldVNode._flags & MATCHED) == 0 &&
				key == oldVNode.key &&
				type == oldVNode.type
			) {
				return childIndex;
			}
		}
	}

	return -1;
}
