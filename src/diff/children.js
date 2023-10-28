import { diff, unmount, applyRef } from './index';
import { createVNode, Fragment } from '../create-element';
import { EMPTY_OBJ, EMPTY_ARR } from '../constants';
import { isArray } from '../util';
import { getDomSibling } from '../component';

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
 * @param {boolean} isSvg Whether or not this DOM node is an SVG node
 * @param {Array<PreactElement>} excessDomChildren
 * @param {Array<Component>} commitQueue List of components which have callbacks
 * to invoke in commitRoot
 * @param {PreactElement} oldDom The current attached DOM element any new dom
 * elements should be placed around. Likely `null` on first render (except when
 * hydrating). Can be a sibling DOM element when diffing Fragments that have
 * siblings. In most cases, it starts out as `oldChildren[0]._dom`.
 * @param {boolean} isHydrating Whether or not we are in hydration
 * @param {any[]} refQueue an array of elements needed to invoke refs
 */
export function diffChildren(
	parentDom,
	renderResult,
	newParentVNode,
	oldParentVNode,
	globalContext,
	isSvg,
	excessDomChildren,
	commitQueue,
	oldDom,
	isHydrating,
	refQueue
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

	let oldChildrenLength = oldChildren.length,
		newChildrenLength = renderResult.length;

	// TODO: Consider replacing with newParentVNode._nextDom;
	// TODO: Is there a better way to track oldDom then a ref? Since
	// constructNewChildrenArray can unmount DOM nodes while looping (to handle
	// null placeholders, i.e. VNode => null in unkeyed children), we need to adjust
	// oldDom in that method.
	const oldDomRef = { _current: oldDom };
	const newChildren = (newParentVNode._children = constructNewChildrenArray(
		newParentVNode,
		renderResult,
		oldChildren,
		oldDomRef
	));
	oldDom = oldDomRef._current;

	// Remove remaining oldChildren if there are any. Loop forwards so that as we
	// unmount DOM from the beginning of the oldChildren, we can adjust oldDom to
	// point to the next child, which needs to be the first DOM node that won't be
	// unmounted.
	for (i = 0; i < oldChildrenLength; i++) {
		oldVNode = oldChildren[i];
		if (oldVNode != null && !oldVNode._matched) {
			if (oldDom == oldVNode._dom) {
				oldDom = getDomSibling(oldVNode);

				if (typeof newParentVNode.type == 'function') {
					// If the parent VNode is a component/fragment, make sure its diff
					// continues with a DOM node that is still mounted in case this loop
					// exits here because the rest of the new children are `null`.
					newParentVNode._nextDom = oldDom;
				}
			}

			unmount(oldVNode, oldVNode);
		}
	}

	for (i = 0; i < newChildrenLength; i++) {
		childVNode = newChildren[i];

		if (
			childVNode == null ||
			typeof childVNode == 'boolean' ||
			typeof childVNode == 'function'
		) {
			continue;
		}

		// At this point, constructNewChildrenArray has assigned _index to be the
		// matchingIndex for this VNode's oldVNode (or -1 if there is no oldVNode).
		if (childVNode._index === -1) {
			oldVNode = EMPTY_OBJ;
		} else {
			oldVNode = oldChildren[childVNode._index] || EMPTY_OBJ;
		}

		// Update childVNode._index to its final index
		childVNode._index = i;

		// Morph the old element into the new one, but don't append it to the dom yet
		diff(
			parentDom,
			childVNode,
			oldVNode,
			globalContext,
			isSvg,
			excessDomChildren,
			commitQueue,
			oldDom,
			isHydrating,
			refQueue
		);

		// Adjust DOM nodes
		newDom = childVNode._dom;
		if (childVNode.ref && oldVNode.ref != childVNode.ref) {
			if (oldVNode.ref) {
				applyRef(oldVNode.ref, null, childVNode);
			}
			refQueue.push(
				childVNode.ref,
				childVNode._component || newDom,
				childVNode
			);
		}

		if (firstChildDom == null && newDom != null) {
			firstChildDom = newDom;
		}

		if (typeof childVNode.type == 'function') {
			if (childVNode._insert || oldVNode._children === childVNode._children) {
				oldDom = reorderChildren(childVNode, oldDom, parentDom);
			} else if (childVNode._nextDom !== undefined) {
				// Only Fragments or components that return Fragment like VNodes will
				// have a non-undefined _nextDom. Continue the diff from the sibling
				// of last DOM child of this child VNode
				oldDom = childVNode._nextDom;
			} else if (newDom) {
				oldDom = newDom.nextSibling;
			}

			// Eagerly cleanup _nextDom. We don't need to persist the value because
			// it is only used by `diffChildren` to determine where to resume the diff after
			// diffing Components and Fragments. Once we store it the nextDOM local var, we
			// can clean up the property
			childVNode._nextDom = undefined;
		} else if (newDom) {
			if (childVNode._insert) {
				oldDom = placeChild(parentDom, newDom, oldDom);
			} else {
				oldDom = newDom.nextSibling;
			}
		}

		// TODO: With new child diffing algo, consider alt ways to diff Fragments.
		// Such as dropping oldDom and moving fragments in place
		if (typeof newParentVNode.type == 'function') {
			// Because the newParentVNode is Fragment-like, we need to set it's
			// _nextDom property to the nextSibling of its last child DOM node.
			//
			// `oldDom` contains the correct value here because if the last child
			// is a Fragment-like, then oldDom has already been set to that child's _nextDom.
			// If the last child is a DOM VNode, then oldDom will be set to that DOM
			// node's nextSibling.
			newParentVNode._nextDom = oldDom;
		}

		// Unset diffing flags
		childVNode._insert = false;
	}

	newParentVNode._dom = firstChildDom;
}

/**
 * @param {VNode} newParentVNode
 * @param {ComponentChildren[]} renderResult
 * @param {VNode[]} oldChildren
 * @param {{ _current: PreactElement }} oldDomRef
 * @returns {VNode[]}
 */
function constructNewChildrenArray(
	newParentVNode,
	renderResult,
	oldChildren,
	oldDomRef
) {
	/** @type {number} */
	let i;
	/** @type {VNode} */
	let childVNode;
	let newChildrenLength = renderResult.length;
	let remainingOldChildren = oldChildren.length;
	let skew = 0;

	/** @type {VNode[]} */
	const newChildren = [];
	for (i = 0; i < newChildrenLength; i++) {
		// @ts-expect-error We are reusing the childVNode variable to hold both the
		// pre and post normalized childVNode
		childVNode = renderResult[i];

		if (
			childVNode == null ||
			typeof childVNode == 'boolean' ||
			typeof childVNode == 'function'
		) {
			childVNode = newChildren[i] = null;
		}
		// If this newVNode is being reused (e.g. <div>{reuse}{reuse}</div>) in the same diff,
		// or we are rendering a component (e.g. setState) copy the oldVNodes so it can have
		// it's own DOM & etc. pointers
		else if (
			childVNode.constructor == String ||
			typeof childVNode == 'number' ||
			// eslint-disable-next-line valid-typeof
			typeof childVNode == 'bigint'
		) {
			childVNode = newChildren[i] = createVNode(
				null,
				childVNode,
				null,
				null,
				childVNode
			);
		} else if (isArray(childVNode)) {
			childVNode = newChildren[i] = createVNode(
				Fragment,
				{ children: childVNode },
				null,
				null,
				null
			);
		} else if (childVNode._depth > 0) {
			// VNode is already in use, clone it. This can happen in the following
			// scenario:
			//   const reuse = <div />
			//   <div>{reuse}<span />{reuse}</div>
			childVNode = newChildren[i] = createVNode(
				childVNode.type,
				childVNode.props,
				childVNode.key,
				childVNode.ref ? childVNode.ref : null,
				childVNode._original
			);
		} else {
			childVNode = newChildren[i] = childVNode;
		}

		// Handle unmounting null placeholders, i.e. VNode => null in unkeyed children
		if (childVNode == null) {
			const oldVNode = oldChildren[i];
			if (oldVNode && oldVNode.key == null && oldVNode._dom) {
				if (oldVNode._dom == oldDomRef._current) {
					oldDomRef._current = getDomSibling(oldVNode);

					if (typeof newParentVNode.type == 'function') {
						// If the parent VNode is a component/fragment, make sure its diff
						// continues with a DOM node that is still mounted in case this loop
						// exits here because the rest of the new children are `null`.
						newParentVNode._nextDom = oldDomRef._current;
					}
				}

				unmount(oldVNode, oldVNode, false);

				// Explicitly nullify this position in oldChildren instead of just
				// setting `_match=true` to prevent other routines (e.g.
				// `findMatchingIndex` or `getDomSibling`) from thinking VNodes or DOM
				// nodes in this position are still available to be used in diffing when
				// they have actually already been unmounted. For example, by only
				// setting `_match=true` here, the unmounting loop later would attempt
				// to unmount this VNode again seeing `_match==true`.  Further,
				// getDomSibling doesn't know about _match and so would incorrectly
				// assume DOM nodes in this subtree are mounted and usable.
				oldChildren[i] = null;
				remainingOldChildren--;
			}

			continue;
		}

		childVNode._parent = newParentVNode;
		childVNode._depth = newParentVNode._depth + 1;

		let skewedIndex = i + skew;
		const matchingIndex = findMatchingIndex(
			childVNode,
			oldChildren,
			skewedIndex,
			remainingOldChildren
		);

		// Temporarily store the matchingIndex on the _index property so we can pull
		// out the oldVNode in diffChildren. We'll override this to the VNode's
		// final index after using this property to get the oldVNode
		childVNode._index = matchingIndex;

		if (matchingIndex !== -1) {
			remainingOldChildren--;
			if (oldChildren[matchingIndex]) {
				// TODO: Can we somehow not use this property? or override another
				// property? We need it now so we can pull off the matchingIndex in
				// diffChildren and when unmounting we can get the next DOM element by
				// calling getDomSibling, which needs a complete oldTree
				oldChildren[matchingIndex]._matched = true;
			}
		}

		// Here, we define isMounting for the purposes of the skew diffing
		// algorithm. Nodes that are unsuspending are considered mounting and we detect
		// this by checking if oldVNode._original === null
		let isMounting =
			matchingIndex === -1 ||
			oldChildren[matchingIndex] == null ||
			oldChildren[matchingIndex]._original === null;

		if (isMounting) {
			if (matchingIndex == -1) {
				skew--;
			}
		} else if (matchingIndex !== skewedIndex) {
			if (matchingIndex === skewedIndex + 1) {
				skew++;
			} else if (matchingIndex > skewedIndex) {
				if (remainingOldChildren > newChildrenLength - skewedIndex) {
					skew += matchingIndex - skewedIndex;
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
		}

		// Move this VNode's DOM if the original index (matchingIndex) doesn't match
		// the new skew index (i + skew) or it's a mounting component VNode
		if (
			matchingIndex !== i + skew ||
			(typeof childVNode.type != 'function' && isMounting)
		) {
			childVNode._insert = true;
		}
	}

	return newChildren;
}

/**
 * @param {VNode} childVNode
 * @param {PreactElement} oldDom
 * @param {PreactElement} parentDom
 * @returns {PreactElement}
 */
function reorderChildren(childVNode, oldDom, parentDom) {
	// Note: VNodes in nested suspended trees may be missing _children.
	let c = childVNode._children;

	let tmp = 0;
	for (; c && tmp < c.length; tmp++) {
		let vnode = c[tmp];
		if (vnode) {
			// We typically enter this code path on sCU bailout, where we copy
			// oldVNode._children to newVNode._children. If that is the case, we need
			// to update the old children's _parent pointer to point to the newVNode
			// (childVNode here).
			vnode._parent = childVNode;

			if (typeof vnode.type == 'function') {
				oldDom = reorderChildren(vnode, oldDom, parentDom);
			} else {
				oldDom = placeChild(parentDom, vnode._dom, oldDom);
			}
		}
	}

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
	if (children == null || typeof children == 'boolean') {
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
 * @param {PreactElement} parentDom
 * @param {PreactElement} newDom
 * @param {PreactElement} oldDom
 * @returns {PreactElement}
 */
function placeChild(parentDom, newDom, oldDom) {
	if (newDom != oldDom) {
		parentDom.insertBefore(newDom, oldDom || null);
	}

	return newDom.nextSibling;
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
	let x = skewedIndex - 1;
	let y = skewedIndex + 1;
	let oldVNode = oldChildren[skewedIndex];

	// We only need to perform a search if there are more children
	// (remainingOldChildren) to search. However, if the oldVNode we just looked
	// at skewedIndex was not already used in this diff, then there must be at
	// least 1 other (so greater than 1) remainingOldChildren to attempt to match
	// against. So the following condition checks that ensuring
	// remainingOldChildren > 1 if the oldVNode is not already used/matched. Else
	// if the oldVNode was null or matched, then there could needs to be at least
	// 1 (aka `remainingOldChildren > 0`) children to find and compare against.
	let shouldSearch =
		remainingOldChildren > (oldVNode != null && !oldVNode._matched ? 1 : 0);

	if (
		oldVNode === null ||
		(oldVNode && key == oldVNode.key && type === oldVNode.type)
	) {
		return skewedIndex;
	} else if (shouldSearch) {
		while (x >= 0 || y < oldChildren.length) {
			if (x >= 0) {
				oldVNode = oldChildren[x];
				if (
					oldVNode &&
					!oldVNode._matched &&
					key == oldVNode.key &&
					type === oldVNode.type
				) {
					return x;
				}
				x--;
			}

			if (y < oldChildren.length) {
				oldVNode = oldChildren[y];
				if (
					oldVNode &&
					!oldVNode._matched &&
					key == oldVNode.key &&
					type === oldVNode.type
				) {
					return y;
				}
				y++;
			}
		}
	}

	return -1;
}
