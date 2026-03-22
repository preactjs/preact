import { diff, applyRef, queuePlacement } from './index';
import { createVNode, Fragment } from '../create-element';
import {
	EMPTY_OBJ,
	EMPTY_ARR,
	HAS_KEY,
	HAS_RAW_ARRAY_CHILDREN,
	INSERT_VNODE,
	MATCHED,
	SINGLE_TEXT_CHILD,
	UNDEFINED,
	NULL
} from '../constants';
import { isArray } from '../util';
import {
	getOwnedChildren,
	getOwnedVChildren,
	getOwnedVNode,
	isBackingNode,
	setOwnedChildren,
	setOwnedRange
} from '../backing';
import { getDomSibling } from '../component';
import { getAnchorDom, getFirstDom, getLastDom } from '../range';

const PLAN_NONE = 0;
const PLAN_RETAIN = 1;
const PLAN_INSERT = 2;
const PLAN_MOVE = 3;

/**
 * @typedef {import('../internal').ComponentChildren} ComponentChildren
 * @typedef {import('../internal').ChildDiffStats} ChildDiffStats
 * @typedef {import('../internal').Component} Component
 * @typedef {import('../internal').HostOpCounts} HostOpCounts
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
 * @param {any[]} hostOps
 * @param {VNode[]} unmountQueue
 * @param {any[]} removeOps
 * @param {PreactElement} oldDom The current attached DOM element any new dom
 * elements should be placed around. Likely `null` on first render (except when
 * hydrating). Can be a sibling DOM element when diffing Fragments that have
 * siblings. In most cases, it starts out as `oldChildren[0]._dom`.
 * @param {boolean} isHydrating Whether or not we are in hydration
 * @param {any[]} refQueue an array of elements needed to invoke refs
 * @param {HostOpCounts | null} hostOpCounts
 * @param {ChildDiffStats | null} childDiffStats
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
	hostOps,
	unmountQueue,
	removeOps,
	oldDom,
	isHydrating,
	refQueue,
	hostOpCounts,
	childDiffStats
) {
	let i,
		/** @type {VNode} */
		oldVNode,
		/** @type {VNode} */
		childVNode,
		/** @type {PreactElement} */
		newDom,
		/** @type {PreactElement} */
		lastDom,
		/** @type {PreactElement} */
		firstChildDom,
		/** @type {PreactElement} */
		lastChildDom,
		matchingIndex;

	// This is a compression of oldParentVNode!=null && oldParentVNode != EMPTY_OBJ && oldParentVNode._children || EMPTY_ARR
	// as EMPTY_OBJ._children should be `undefined`.
	/** @type {(VNode | import('../internal').BackingNode | null)[]} */
	let oldMountedChildren =
		(oldParentVNode && getOwnedChildren(oldParentVNode)) || EMPTY_ARR;
	/** @type {VNode[]} */
	let oldChildren =
		(oldParentVNode && getOwnedVChildren(oldParentVNode)) || EMPTY_ARR;
	let fastResult = diffSingleTextChild(
		parentDom,
		renderResult,
		newParentVNode,
		oldChildren,
		globalContext,
		namespace,
		excessDomChildren,
		commitQueue,
		hostOps,
		unmountQueue,
		removeOps,
		oldDom,
		isHydrating,
		refQueue,
		hostOpCounts,
		childDiffStats
	);

	if (fastResult !== UNDEFINED) {
		return fastResult;
	}

	let newChildrenLength = renderResult.length;
	let hasKeys =
		!hasDuplicateKeysInRawChildren(renderResult) &&
		(hasKeysInRawChildren(renderResult) || hasKeysInChildren(oldChildren));

	if (
		!hasKeys &&
		canDiffStrictUnkeyedChildren(
			parentDom,
			newParentVNode,
			renderResult,
			oldChildren,
			excessDomChildren,
			isHydrating
		)
	) {
		return diffStrictUnkeyedChildren(
			parentDom,
			renderResult,
			newParentVNode,
			oldChildren,
			globalContext,
			namespace,
			excessDomChildren,
			commitQueue,
			hostOps,
			unmountQueue,
			removeOps,
			oldDom,
			isHydrating,
			refQueue,
			hostOpCounts,
			childDiffStats
		);
	}

	let constructed = constructNewChildrenArray(
		newParentVNode,
		renderResult,
		oldMountedChildren,
		unmountQueue,
		removeOps,
		oldDom,
		newChildrenLength,
		hasKeys,
		hostOpCounts,
		childDiffStats
	);
	let children = constructed._children;
	oldDom = constructed._oldDom;
	let placementOldDom = oldDom;
	let matchingIndices = new Array(newChildrenLength);
	let forcePlacement = new Uint8Array(newChildrenLength);
	let placementFirstDom = new Array(newChildrenLength);
	let placementAnchors = new Array(newChildrenLength);
	let placementBefore = new Array(newChildrenLength);
	let placementStatus = new Uint8Array(newChildrenLength);
	let needsPlacement = false;
	setOwnedRange(
		newParentVNode,
		getFirstDom(newParentVNode),
		getLastDom(newParentVNode),
		NULL
	);

	for (i = 0; i < newChildrenLength; i++) {
		childVNode = children[i];
		if (childVNode == NULL) continue;

		// At this point, constructNewChildrenArray has assigned _index to be the
		// matchingIndex for this VNode's oldVNode (or -1 if there is no oldVNode).
		matchingIndex = childVNode._index;
		matchingIndices[i] = matchingIndex;
		oldVNode = (matchingIndex != -1 && oldChildren[matchingIndex]) || EMPTY_OBJ;
		if (
			typeof childVNode.type != 'function' &&
			(matchingIndex == -1 || oldChildren[matchingIndex] == NULL)
		) {
			forcePlacement[i] = 1;
			placementStatus[i] = PLAN_INSERT;
			needsPlacement = true;
			if (childDiffStats != NULL) childDiffStats.forcedPlacement++;
		}

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
			hostOps,
			unmountQueue,
			removeOps,
			oldDom,
			isHydrating,
			refQueue,
			(newParentVNode._flags & SINGLE_TEXT_CHILD) != 0 &&
				(newParentVNode._flags & HAS_KEY) == 0 &&
				matchingIndex != -1 &&
				childVNode.type == NULL &&
				oldVNode !== EMPTY_OBJ &&
				getFirstDom(oldVNode) != NULL &&
				(childVNode._flags & INSERT_VNODE) == 0,
			hostOpCounts,
			childDiffStats
		);

		// Adjust DOM nodes
		newDom = getFirstDom(childVNode);
		lastDom = getLastDom(childVNode);
		placementFirstDom[i] =
			newDom != NULL
				? newDom
				: matchingIndex != -1 && oldVNode !== EMPTY_OBJ
					? getFirstDom(oldVNode)
					: NULL;
		placementAnchors[i] =
			newDom != NULL
				? childVNode
				: matchingIndex != -1 && oldVNode !== EMPTY_OBJ
					? oldVNode
					: NULL;
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
			setOwnedRange(
				newParentVNode,
				firstChildDom,
				lastChildDom,
				getAnchorDom(childVNode)
			);
		}
		if (lastDom != NULL) {
			lastChildDom = lastDom;
		}

		if (typeof childVNode.type == 'function' && oldVNode !== EMPTY_OBJ) {
			let oldFirstDom = getFirstDom(oldVNode);
			let oldLastDom = getLastDom(oldVNode);
			if (
				newDom != NULL &&
				(oldFirstDom !== newDom || oldLastDom !== lastDom)
			) {
				forcePlacement[i] = 1;
				placementStatus[i] = oldFirstDom == NULL ? PLAN_INSERT : PLAN_MOVE;
				needsPlacement = true;
				if (childDiffStats != NULL) childDiffStats.forcedPlacement++;
			}
		}

		if (newDom != NULL && placementStatus[i] == PLAN_NONE) {
			if (matchingIndex == -1) {
				placementStatus[i] = PLAN_INSERT;
				needsPlacement = true;
			} else if (childVNode._flags & INSERT_VNODE) {
				placementStatus[i] = matchingIndex == -1 ? PLAN_INSERT : PLAN_MOVE;
				needsPlacement = true;
			} else {
				placementStatus[i] = PLAN_RETAIN;
			}
		}

		if (!(childVNode._flags & INSERT_VNODE) && lastDom) {
			oldDom = getDomSiblingAfter(lastDom);
		} else if (typeof childVNode.type == 'function' && result !== UNDEFINED) {
			oldDom = result;
		}
	}

	setOwnedRange(
		newParentVNode,
		firstChildDom,
		lastChildDom,
		getAnchorDom(newParentVNode)
	);

	if (needsPlacement) {
		if (childDiffStats != NULL) childDiffStats.placementPasses++;
		let placementSeed =
			newParentVNode.type === Fragment
				? getDomSibling(newParentVNode)
				: typeof newParentVNode.type == 'function' &&
					  countNonNullChildren(children) <= 1
					? placementOldDom
					: typeof newParentVNode.type == 'function'
						? oldDom
						: NULL;
		if (
			newParentVNode.type === Fragment &&
			oldParentVNode === EMPTY_OBJ &&
			canPlaceFreshFragmentChildrenLeftToRight(
				children,
				matchingIndices,
				placementStatus,
				placementFirstDom
			)
		) {
			for (i = 0; i < newChildrenLength; i++) {
				childVNode = children[i];
				if (childVNode != NULL && placementFirstDom[i] != NULL) {
					queuePlacement(
						childVNode,
						placementSeed,
						parentDom,
						hostOps,
						hostOpCounts
					);
				}
			}
		} else {
			planPlacements(
				children,
				matchingIndices,
				forcePlacement,
				placementFirstDom,
				placementAnchors,
				placementBefore,
				placementStatus,
				parentDom,
				hostOps,
				placementSeed,
				hasKeys,
				hostOpCounts
			);
		}
	}

	for (i = 0; i < newChildrenLength; i++) {
		childVNode = children[i];
		if (childVNode != NULL) {
			childVNode._flags &= ~(INSERT_VNODE | MATCHED);
		}
	}

	setOwnedChildren(newParentVNode, children);
	return oldDom;
}

function diffSingleTextChild(
	parentDom,
	renderResult,
	newParentVNode,
	oldChildren,
	globalContext,
	namespace,
	excessDomChildren,
	commitQueue,
	hostOps,
	unmountQueue,
	removeOps,
	oldDom,
	isHydrating,
	refQueue,
	hostOpCounts,
	childDiffStats
) {
	if (
		(newParentVNode._flags & SINGLE_TEXT_CHILD) == 0 ||
		(newParentVNode._flags & HAS_KEY) != 0 ||
		renderResult.length !== 1 ||
		oldChildren.length !== 1
	) {
		return UNDEFINED;
	}
	if (childDiffStats != NULL) childDiffStats.fastSingleText++;

	let value = renderResult[0];
	let oldVNode = oldChildren[0];
	if (
		oldVNode == NULL ||
		oldVNode.type != NULL ||
		(oldVNode._flags & MATCHED) != 0
	) {
		return UNDEFINED;
	}

	let childVNode = createVNode(NULL, value, NULL, NULL, NULL);
	childVNode._parent = newParentVNode;
	childVNode._depth = newParentVNode._depth + 1;
	childVNode._index = 0;
	let children = [childVNode];
	setOwnedRange(newParentVNode, NULL, NULL, NULL);

	diff(
		parentDom,
		childVNode,
		oldVNode || EMPTY_OBJ,
		globalContext,
		namespace,
		excessDomChildren,
		commitQueue,
		hostOps,
		unmountQueue,
		removeOps,
		oldDom,
		isHydrating,
		refQueue,
		true,
		hostOpCounts,
		childDiffStats
	);

	setOwnedRange(
		newParentVNode,
		getFirstDom(childVNode),
		getLastDom(childVNode),
		getAnchorDom(childVNode)
	);
	setOwnedChildren(newParentVNode, children);

	if (oldVNode != NULL) {
		oldVNode._flags &= ~MATCHED;
	}

	let childLastDom = getLastDom(childVNode);
	return childLastDom ? getDomSiblingAfter(childLastDom) : oldDom;
}

function diffStrictUnkeyedChildren(
	parentDom,
	renderResult,
	newParentVNode,
	oldChildren,
	globalContext,
	namespace,
	excessDomChildren,
	commitQueue,
	hostOps,
	unmountQueue,
	removeOps,
	oldDom,
	isHydrating,
	refQueue,
	hostOpCounts,
	childDiffStats
) {
	let i;
	let newChildrenLength = renderResult.length;
	let oldChildrenLength = oldChildren.length;
	let firstChildDom;
	let lastChildDom;
	let matchingIndices = new Array(newChildrenLength);
	let forcePlacement = new Uint8Array(newChildrenLength);
	let placementFirstDom = new Array(newChildrenLength);
	let placementAnchors = new Array(newChildrenLength);
	let placementBefore = new Array(newChildrenLength);
	let placementStatus = new Uint8Array(newChildrenLength);
	let needsPlacement = false;
	setOwnedRange(
		newParentVNode,
		getFirstDom(newParentVNode),
		getLastDom(newParentVNode),
		NULL
	);

	let children = new Array(newChildrenLength);
	for (i = 0; i < newChildrenLength; i++) {
		let childVNode = normalizeChild(
			renderResult[i],
			newParentVNode,
			i,
			childDiffStats
		);
		children[i] = childVNode;
		let oldVNode = oldChildren[i];
		if (childVNode == NULL) {
			if (oldVNode != NULL) {
				oldDom = queueRemoval(
					oldVNode,
					unmountQueue,
					removeOps,
					oldDom,
					hostOpCounts,
					childDiffStats
				);
			}
			continue;
		}

		childVNode._parent = newParentVNode;
		childVNode._depth = newParentVNode._depth + 1;
		childVNode._index = i;

		let reused =
			oldVNode != NULL && getNormalizedType(renderResult[i]) === oldVNode.type;
		if (!reused) {
			if (oldVNode != NULL) {
				oldDom = queueRemoval(
					oldVNode,
					unmountQueue,
					removeOps,
					oldDom,
					hostOpCounts,
					childDiffStats
				);
			}
			oldVNode = EMPTY_OBJ;
			if (typeof childVNode.type != 'function') {
				childVNode._flags |= INSERT_VNODE;
			}
			matchingIndices[i] = -1;
			forcePlacement[i] = 1;
			placementStatus[i] = PLAN_INSERT;
			needsPlacement = true;
			if (childDiffStats != NULL) childDiffStats.mounts++;
		} else {
			matchingIndices[i] = i;
			if (childDiffStats != NULL) childDiffStats.matchedByIndex++;
		}

		let result = diff(
			parentDom,
			childVNode,
			oldVNode,
			globalContext,
			namespace,
			excessDomChildren,
			commitQueue,
			hostOps,
			unmountQueue,
			removeOps,
			oldDom,
			isHydrating,
			refQueue,
			(newParentVNode._flags & SINGLE_TEXT_CHILD) != 0 &&
				childVNode.type == NULL &&
				oldVNode !== EMPTY_OBJ &&
				getFirstDom(oldVNode) != NULL,
			hostOpCounts,
			childDiffStats
		);

		let newDom = getFirstDom(childVNode);
		let lastDom = getLastDom(childVNode);
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
			setOwnedRange(
				newParentVNode,
				firstChildDom,
				lastChildDom,
				getAnchorDom(childVNode)
			);
		}
		if (lastDom != NULL) lastChildDom = lastDom;

		placementFirstDom[i] =
			newDom != NULL
				? newDom
				: oldVNode !== EMPTY_OBJ
					? getFirstDom(oldVNode)
					: NULL;
		placementAnchors[i] =
			newDom != NULL ? childVNode : oldVNode !== EMPTY_OBJ ? oldVNode : NULL;
		if (newDom != NULL && placementStatus[i] == PLAN_NONE) {
			placementStatus[i] = oldVNode === EMPTY_OBJ ? PLAN_INSERT : PLAN_RETAIN;
		}

		if (oldVNode !== EMPTY_OBJ && lastDom) {
			oldDom = getDomSiblingAfter(lastDom);
		} else if (typeof childVNode.type == 'function' && result !== UNDEFINED) {
			oldDom = result;
		}

		childVNode._flags &= ~(INSERT_VNODE | MATCHED);
	}

	for (; i < oldChildrenLength; i++) {
		let oldVNode = oldChildren[i];
		if (oldVNode != NULL) {
			oldDom = queueRemoval(
				oldVNode,
				unmountQueue,
				removeOps,
				oldDom,
				hostOpCounts,
				childDiffStats
			);
		}
	}

	setOwnedRange(
		newParentVNode,
		firstChildDom,
		lastChildDom,
		getAnchorDom(newParentVNode)
	);
	if (needsPlacement) {
		if (childDiffStats != NULL) childDiffStats.placementPasses++;
		planPlacements(
			children,
			matchingIndices,
			forcePlacement,
			placementFirstDom,
			placementAnchors,
			placementBefore,
			placementStatus,
			parentDom,
			hostOps,
			oldDom,
			false,
			hostOpCounts
		);
	}
	setOwnedChildren(newParentVNode, children);
	return oldDom;
}

function canDiffStrictUnkeyedChildren(
	parentDom,
	newParentVNode,
	renderResult,
	oldChildren,
	excessDomChildren,
	isHydrating
) {
	if (
		isHydrating ||
		excessDomChildren != NULL ||
		parentDom.nodeType == 9 ||
		(newParentVNode._flags & HAS_RAW_ARRAY_CHILDREN) != 0
	) {
		return false;
	}
	return true;
}

function getNormalizedType(child) {
	if (
		child == NULL ||
		typeof child == 'boolean' ||
		typeof child == 'function'
	) {
		return NULL;
	}

	if (
		typeof child == 'string' ||
		typeof child == 'number' ||
		typeof child == 'bigint' ||
		child.constructor == String
	) {
		return NULL;
	}

	if (isArray(child)) {
		return Fragment;
	}

	return child.type;
}

function normalizeChild(childVNode, newParentVNode, index, childDiffStats) {
	if (
		childVNode == NULL ||
		typeof childVNode == 'boolean' ||
		typeof childVNode == 'function'
	) {
		return NULL;
	}

	if (
		typeof childVNode == 'string' ||
		typeof childVNode == 'number' ||
		typeof childVNode == 'bigint' ||
		childVNode.constructor == String
	) {
		if (childDiffStats != NULL) childDiffStats.normalizedText++;
		childVNode = createVNode(NULL, childVNode, NULL, NULL, NULL);
	} else if (isArray(childVNode)) {
		if (childDiffStats != NULL) childDiffStats.normalizedArray++;
		childVNode = createVNode(
			Fragment,
			{ children: childVNode },
			NULL,
			NULL,
			NULL
		);
	} else if (childVNode.constructor === UNDEFINED && childVNode._depth > 0) {
		if (childDiffStats != NULL) childDiffStats.clonedVNode++;
		childVNode = createVNode(
			childVNode.type,
			childVNode.props,
			childVNode.key,
			childVNode.ref ? childVNode.ref : NULL,
			childVNode._original
		);
	}

	return childVNode;
}

function queueRemoval(
	oldVNode,
	unmountQueue,
	removeOps,
	oldDom,
	hostOpCounts,
	childDiffStats
) {
	let oldFirstDom = getFirstDom(oldVNode);
	if (oldFirstDom == oldDom) {
		oldDom = getDomSibling(oldVNode);
	}
	if (oldFirstDom != NULL) {
		if (hostOpCounts != NULL) hostOpCounts.removeRange++;
		if (childDiffStats != NULL) childDiffStats.removals++;
		removeOps.push(oldFirstDom, getLastDom(oldVNode));
	}
	unmountQueue.push(oldVNode);
	return oldDom;
}

/**
 * @param {VNode} newParentVNode
 * @param {ComponentChildren[]} renderResult
 * @param {(VNode | import('../internal').BackingNode | null)[]} oldChildren
 */
function constructNewChildrenArray(
	newParentVNode,
	renderResult,
	oldChildren,
	unmountQueue,
	removeOps,
	oldDom,
	newChildrenLength,
	hasKeys,
	hostOpCounts,
	childDiffStats
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
	let children = new Array(newChildrenLength);
	for (i = 0; i < newChildrenLength; i++) {
		// @ts-expect-error We are reusing the childVNode variable to hold both the
		// pre and post normalized childVNode
		childVNode = renderResult[i];

		if (
			childVNode == NULL ||
			typeof childVNode == 'boolean' ||
			typeof childVNode == 'function'
		) {
			children[i] = NULL;
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
			childVNode = children[i] = createVNode(
				NULL,
				childVNode,
				NULL,
				NULL,
				NULL
			);
			if (childDiffStats != NULL) childDiffStats.normalizedText++;
		} else if (isArray(childVNode)) {
			childVNode = children[i] = createVNode(
				Fragment,
				{ children: childVNode },
				NULL,
				NULL,
				NULL
			);
			if (childDiffStats != NULL) childDiffStats.normalizedArray++;
		} else if (childVNode.constructor === UNDEFINED && childVNode._depth > 0) {
			// VNode is already in use, clone it. This can happen in the following
			// scenario:
			//   const reuse = <div />
			//   <div>{reuse}<span />{reuse}</div>
			childVNode = children[i] = createVNode(
				childVNode.type,
				childVNode.props,
				childVNode.key,
				childVNode.ref ? childVNode.ref : NULL,
				childVNode._original
			);
			if (childDiffStats != NULL) childDiffStats.clonedVNode++;
		} else {
			children[i] = childVNode;
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
			i,
			skewedIndex,
			remainingOldChildren,
			hasKeys,
			childDiffStats
		));

		oldVNode = NULL;
		if (matchingIndex != -1) {
			oldVNode = getOwnedVNode(oldChildren[matchingIndex]);
			if (oldVNode) {
				remainingOldChildren--;
				oldVNode._flags |= MATCHED;
			}
		}

		// Here, we define isMounting for the purposes of the skew diffing
		// algorithm. Nodes that are unsuspending are considered mounting and we detect
		// this by checking if oldVNode._original == null
		const isMounting = oldVNode == NULL || oldVNode._original == NULL;

		if (isMounting) {
			if (childDiffStats != NULL) childDiffStats.mounts++;
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
		} else if (matchingIndex != skewedIndex) {
			if (childDiffStats != NULL) childDiffStats.moved++;
			// When we move elements around i.e. [0, 1, 2] --> [1, 0, 2]
			// --> we diff 1, we find it at position 1 while our skewed index is 0 and our skew is 0
			//     we set the skew to 1 as we found an offset.
			// --> we diff 0, we find it at position 0 while our skewed index is at 2 and our skew is 1
			//     this makes us increase the skew again.
			// --> we diff 2, we find it at position 2 while our skewed index is at 4 and our skew is 2
			//
			// this becomes an optimization question where currently we see a 1 element offset as an insertion
			// or deletion i.e. we optimize for [0, 1, 2] --> [9, 0, 1, 2]
			// while a more than 1 offset we see as a swap.
			// We could probably build heuristics for having an optimized course of action here as well, but
			// might go at the cost of some bytes.
			//
			// If we wanted to optimize for i.e. only swaps we'd just do the last two code-branches and have
			// only the first item be a re-scouting and all the others fall in their skewed counter-part.
			// We could also further optimize for swaps
			if (matchingIndex == skewedIndex - 1) {
				skew--;
			} else if (matchingIndex == skewedIndex + 1) {
				skew++;
			} else {
				if (matchingIndex > skewedIndex) {
					skew--;
				} else {
					skew++;
				}

				// Move this VNode's DOM if the original index (matchingIndex) doesn't
				// match the new skew index (i + new skew)
				// In the former two branches we know that it matches after skewing
				childVNode._flags |= INSERT_VNODE;
			}
		}
	}

	// Remove remaining oldChildren if there are any. Loop forwards so that as we
	// unmount DOM from the beginning of the oldChildren, we can adjust oldDom to
	// point to the next child, which needs to be the first DOM node that won't be
	// unmounted.
	if (remainingOldChildren) {
		for (i = 0; i < oldChildrenLength; i++) {
			oldVNode = getOwnedVNode(oldChildren[i]);
			if (oldVNode != NULL && (oldVNode._flags & MATCHED) == 0) {
				let oldFirstDom = getFirstDom(oldVNode);
				if (oldFirstDom == oldDom) {
					oldDom = getDomSibling(oldVNode);
				}
				if (oldFirstDom != NULL) {
					if (hostOpCounts != NULL) hostOpCounts.removeRange++;
					if (childDiffStats != NULL) childDiffStats.removals++;
					removeOps.push(oldFirstDom, getLastDom(oldVNode));
				}
				unmountQueue.push(oldVNode);
			}
		}
	}

	return { _children: children, _oldDom: oldDom };
}

/**
 * @param {PreactElement} dom
 * @returns {PreactElement}
 */
function getDomSiblingAfter(dom) {
	do {
		dom = dom && dom.nextSibling;
	} while (dom != NULL && dom.nodeType == 8);
	return dom;
}

function planPlacements(
	children,
	matchingIndices,
	forcePlacement,
	firstDoms,
	anchors,
	befores,
	placementStatus,
	parentDom,
	hostOps,
	oldDom,
	hasKeys,
	hostOpCounts
) {
	computePlacementBefores(firstDoms, anchors, befores, oldDom);

	if (children.length === 1) {
		let child = children[0];
		if (child != NULL && firstDoms[0] != NULL) {
			if (
				shouldPlaceChild(
					placementStatus[0],
					matchingIndices[0],
					forcePlacement[0]
				)
			) {
				queuePlacement(child, befores[0], parentDom, hostOps, hostOpCounts);
			}
		}
		return;
	}

	if (!hasKeys) {
		for (let i = children.length; i--; ) {
			let child = children[i];
			if (child == NULL || firstDoms[i] == NULL) continue;

			if (
				shouldPlaceChild(
					placementStatus[i],
					matchingIndices[i],
					forcePlacement[i]
				)
			) {
				queuePlacement(child, befores[i], parentDom, hostOps, hostOpCounts);
			}
		}

		return;
	}

	let stable = getStablePlacementSet(
		firstDoms,
		matchingIndices,
		forcePlacement,
		placementStatus
	);

	for (let i = children.length; i--; ) {
		let child = children[i];
		if (child == NULL || firstDoms[i] == NULL) continue;
		if (
			shouldPlaceChild(
				placementStatus[i],
				matchingIndices[i],
				forcePlacement[i]
			) ||
			(!stable[i] && matchingIndices[i] != -1)
		) {
			queuePlacement(child, befores[i], parentDom, hostOps, hostOpCounts);
		}
	}
}

function computePlacementBefores(firstDoms, anchors, befores, oldDom) {
	let before = oldDom;
	for (let i = firstDoms.length; i--; ) {
		befores[i] = before;
		if (firstDoms[i] != NULL) before = anchors[i];
	}
}

function shouldPlaceChild(status, matchingIndex, forcePlacement) {
	return (
		forcePlacement ||
		status === PLAN_INSERT ||
		(status === PLAN_MOVE && matchingIndex != -1)
	);
}

function getStablePlacementSet(
	firstDoms,
	matchingIndices,
	forcePlacement,
	placementStatus
) {
	let positions = [];
	let recordIndices = [];
	let predecessors = [];
	let tails = [];
	let stable = new Uint8Array(firstDoms.length);

	for (let i = 0; i < firstDoms.length; i++) {
		let oldIndex = matchingIndices[i];
		if (
			firstDoms[i] == NULL ||
			oldIndex == -1 ||
			forcePlacement[i] ||
			placementStatus[i] !== PLAN_RETAIN
		) {
			continue;
		}

		let tailIndex = lowerBound(tails, positions, oldIndex);
		positions.push(oldIndex);
		recordIndices.push(i);
		predecessors.push(tailIndex > 0 ? tails[tailIndex - 1] : -1);

		if (tailIndex == tails.length) {
			tails.push(positions.length - 1);
		} else {
			tails[tailIndex] = positions.length - 1;
		}
	}

	for (
		let i = tails.length ? tails[tails.length - 1] : -1;
		i != -1;
		i = predecessors[i]
	) {
		stable[recordIndices[i]] = 1;
	}

	return stable;
}

function lowerBound(tails, positions, value) {
	let low = 0;
	let high = tails.length;

	while (low < high) {
		let mid = (low + high) >> 1;
		if (positions[tails[mid]] < value) low = mid + 1;
		else high = mid;
	}

	return low;
}

function countNonNullChildren(children) {
	let count = 0;
	for (let i = 0; i < children.length; i++) {
		if (children[i] != NULL) count++;
	}
	return count;
}

function canPlaceFreshFragmentChildrenLeftToRight(
	children,
	matchingIndices,
	placementStatus,
	firstDoms
) {
	let sawChild = false;
	for (let i = 0; i < children.length; i++) {
		if (children[i] == NULL || firstDoms[i] == NULL) continue;
		sawChild = true;
		if (matchingIndices[i] != -1 || placementStatus[i] !== PLAN_INSERT) {
			return false;
		}
	}
	return sawChild;
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
	index,
	skewedIndex,
	remainingOldChildren,
	hasKeys,
	childDiffStats
) {
	const key = childVNode.key;
	if (hasKeys && key == NULL) {
		let oldChild = oldChildren[index];
		let oldVNode = getOwnedVNode(oldChild);
		if (
			(oldVNode === NULL && key == null) ||
			(oldVNode != NULL &&
				(oldVNode._flags & MATCHED) == 0 &&
				oldVNode.key == NULL &&
				sameBoundaryIdentity(childVNode, oldChild, oldVNode))
		) {
			if (childDiffStats != NULL) childDiffStats.matchedByIndex++;
			return index;
		}

		return -1;
	}

	let oldChild = oldChildren[skewedIndex];
	let oldVNode = getOwnedVNode(oldChild);
	const matched = oldVNode != NULL && (oldVNode._flags & MATCHED) == 0;

	if (
		(oldVNode === NULL && key == null) ||
		(matched &&
			key == oldVNode.key &&
			sameBoundaryIdentity(childVNode, oldChild, oldVNode))
	) {
		if (childDiffStats != NULL) childDiffStats.matchedByIndex++;
		return skewedIndex;
	}

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
		key != NULL && hasKeys && remainingOldChildren > (matched ? 1 : 0);
	if (shouldSearch) {
		if (childDiffStats != NULL) childDiffStats.searches++;
		let x = skewedIndex - 1;
		let y = skewedIndex + 1;
		while (x >= 0 || y < oldChildren.length) {
			const childIndex = x >= 0 ? x-- : y++;
			oldChild = oldChildren[childIndex];
			oldVNode = getOwnedVNode(oldChild);
			if (
				oldVNode != NULL &&
				(oldVNode._flags & MATCHED) == 0 &&
				key == oldVNode.key &&
				sameBoundaryIdentity(childVNode, oldChild, oldVNode)
			) {
				if (childDiffStats != NULL) childDiffStats.matchedBySearch++;
				return childIndex;
			}
		}
	}

	return -1;
}

function sameBoundaryIdentity(newVNode, oldChild, oldVNode) {
	if (newVNode.type !== oldVNode.type) {
		return false;
	}

	if (newVNode.type === Fragment) {
		return isBackingNode(oldChild) || oldVNode.type === Fragment;
	}

	return true;
}

function hasKeysInChildren(children) {
	for (let i = 0; i < children.length; i++) {
		if (children[i] != NULL && children[i]._flags & HAS_KEY) return true;
	}
	return false;
}

function hasKeysInRawChildren(children) {
	for (let i = 0; i < children.length; i++) {
		let child = children[i];
		if (isArray(child)) {
			if (hasKeysInRawChildren(child)) return true;
		} else if (
			child != NULL &&
			typeof child == 'object' &&
			(child._flags & HAS_KEY) != 0
		) {
			return true;
		}
	}
	return false;
}

function hasDuplicateKeysInRawChildren(children, seen) {
	seen = seen || new Set();
	for (let i = 0; i < children.length; i++) {
		let child = children[i];
		if (isArray(child)) {
			if (hasDuplicateKeysInRawChildren(child, seen)) return true;
		} else if (
			child != NULL &&
			typeof child == 'object' &&
			(child._flags & HAS_KEY) != 0
		) {
			if (seen.has(child.key)) return true;
			seen.add(child.key);
		}
	}
	return false;
}
