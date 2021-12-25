import { diff, unmount, applyRef } from './index';
import { createVNode, Fragment } from '../create-element';
import { EMPTY_OBJ, EMPTY_ARR } from '../constants';
import { getDomSibling } from '../component';

/**
 * Diff the children of a virtual node
 * @param {import('../internal').PreactElement} parentDom The DOM element whose
 * children are being diffed
 * @param {import('../internal').ComponentChildren[]} renderResult
 * @param {import('../internal').VNode} newParentVNode The new virtual
 * node whose children should be diff'ed against oldParentVNode
 * @param {import('../internal').VNode} oldParentVNode The old virtual
 * node whose children should be diff'ed against newParentVNode
 * @param {object} globalContext The current context object - modified by getChildContext
 * @param {boolean} isSvg Whether or not this DOM node is an SVG node
 * @param {Array<import('../internal').PreactElement>} excessDomChildren
 * @param {Array<import('../internal').Component>} commitQueue List of components
 * which have callbacks to invoke in commitRoot
 * @param {import('../internal').PreactElement} oldDom The current attached DOM
 * element any new dom elements should be placed around. Likely `null` on first
 * render (except when hydrating). Can be a sibling DOM element when diffing
 * Fragments that have siblings. In most cases, it starts out as `oldChildren[0]._dom`.
 * @param {boolean} isHydrating Whether or not we are in hydration
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
	isHydrating
) {
	let i, oldVNode, childVNode, firstChildDom, refs;

	// This is a compression of oldParentVNode!=null && oldParentVNode != EMPTY_OBJ && oldParentVNode._children || EMPTY_ARR
	// as EMPTY_OBJ._children should be `undefined`.
	let oldChildren = (oldParentVNode && oldParentVNode._children) || EMPTY_ARR;

	newParentVNode._children = [];
	for (i = 0; i < renderResult.length; i++) {

		childVNode = getChildNewVNode(renderResult[i], newParentVNode, i);
		if (!childVNode) continue;

		oldVNode = getChildOldVNode(childVNode, oldChildren, i);

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
			isHydrating
		);

		if (childVNode._dom && !firstChildDom) firstChildDom = childVNode._dom;

		if (oldVNode.ref != childVNode.ref) {
			if (!refs) refs = [];
			addChildRef(refs, childVNode, oldVNode);
		}

		oldDom = updateChildDom(parentDom, newParentVNode, oldChildren, childVNode, childVNode._dom, oldVNode, oldDom);
	}

	newParentVNode._dom = firstChildDom;

	removeOldChildren(oldChildren, oldParentVNode, newParentVNode);

	applyChildRefs(refs);
}

/**
 * returns child new virtual node
 */
export function getChildNewVNode(renderResult, newParentVNode, childNo) {
	let childVNode = renderResult;

	if (childVNode == null || typeof childVNode == 'boolean') {
		childVNode = newParentVNode._children[childNo] = null;
	}
		// If this newVNode is being reused (e.g. <div>{reuse}{reuse}</div>) in the same diff,
		// or we are rendering a component (e.g. setState) copy the oldVNodes so it can have
	// it's own DOM & etc. pointers
	else if (
		typeof childVNode == 'string' ||
		typeof childVNode == 'number' ||
		// eslint-disable-next-line valid-typeof
		typeof childVNode == 'bigint'
	) {
		childVNode = newParentVNode._children[childNo] = createVNode(
			null,
			childVNode,
			null,
			null,
			childVNode
		);
	} else if (Array.isArray(childVNode)) {
		childVNode = newParentVNode._children[childNo] = createVNode(
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
		childVNode = newParentVNode._children[childNo] = createVNode(
			childVNode.type,
			childVNode.props,
			childVNode.key,
			null,
			childVNode._original
		);
	} else {
		childVNode = newParentVNode._children[childNo] = childVNode;
	}

	// Terser removes the `continue` here and wraps the loop body
	// in a `if (childVNode) { ... } condition
	if (childVNode == null) {
		return null;
	}

	childVNode._parent = newParentVNode;
	childVNode._depth = newParentVNode._depth + 1;
	return childVNode;
}

/**
 * returns child old virtual node
 */
export function getChildOldVNode(childVNode, oldChildren, childNo) {

	// Check if we find a corresponding element in oldChildren.
	// If found, delete the array item by setting to `undefined`.
	// We use `undefined`, as `null` is reserved for empty placeholders
	// (holes).
	let oldVNode = oldChildren[childNo];

	if (
		oldVNode === null ||
		(oldVNode &&
			childVNode.key == oldVNode.key &&
			childVNode.type === oldVNode.type)
	) {
		oldChildren[childNo] = undefined;
	} else {
		// Either oldVNode === undefined or oldChildrenLength > 0,
		// so after this loop oldVNode == null or oldVNode is a valid value.
		for (let j = 0; j < oldChildren.length; j++) {
			oldVNode = oldChildren[j];
			// If childVNode is unkeyed, we only match similarly unkeyed nodes, otherwise we match by key.
			// We always match by type (in either case).
			if (
				oldVNode &&
				childVNode.key == oldVNode.key &&
				childVNode.type === oldVNode.type
			) {
				oldChildren[j] = undefined;
				break;
			}
			oldVNode = null;
		}
	}

	return oldVNode || EMPTY_OBJ;
}

/**
 * adds child ref to the refs when applicable
 * @param refs
 * @param childVNode
 * @param oldVNode
 */
export function addChildRef(refs, childVNode, oldVNode) {
	if (oldVNode.ref) refs.push(oldVNode.ref, null, childVNode);
	refs.push(childVNode.ref, childVNode._component || childVNode._dom, childVNode);
}

/**
 * updates child dom
 */
export function updateChildDom(parentDom, newParentVNode, oldChildren, childVNode, newDom, oldVNode, oldDom) {
	if (newDom != null) {
		let childDom;

		if (
			typeof childVNode.type == 'function' &&
			childVNode._children === oldVNode._children
		) {
			childVNode._nextDom = childDom = reorderChildren(
				childVNode,
				oldDom,
				parentDom
			);
		} else {
			childDom = placeChild(
				parentDom,
				childVNode,
				oldVNode,
				oldChildren,
				newDom,
				oldDom
			);
		}

		if (typeof newParentVNode.type == 'function') {
			// Because the newParentVNode is Fragment-like, we need to set it's
			// _nextDom property to the nextSibling of its last child DOM node.
			//
			// `oldDom` contains the correct value here because if the last child
			// is a Fragment-like, then oldDom has already been set to that child's _nextDom.
			// If the last child is a DOM VNode, then oldDom will be set to that DOM
			// node's nextSibling.
			newParentVNode._nextDom = childDom;
		}

		return childDom;
	} else if (
		oldDom &&
		oldVNode._dom == oldDom &&
		oldDom.parentNode != parentDom
	) {
		// The above condition is to handle null placeholders. See test in placeholder.test.js:
		// `efficiently replace null placeholders in parent rerenders`
		return getDomSibling(oldVNode);
	}
}

/**
 * removes old children
 */
export function removeOldChildren(oldChildren, oldParentVNode, newParentVNode) {
	// Remove remaining oldChildren if there are any.
	for (let i = oldChildren.length; i--; ) {
		if (oldChildren[i] != null) {
			if (
				typeof newParentVNode.type == 'function' &&
				oldChildren[i]._dom != null &&
				oldChildren[i]._dom == newParentVNode._nextDom
			) {
				// If the newParentVNode.__nextDom points to a dom node that is about to
				// be unmounted, then get the next sibling of that vnode and set
				// _nextDom to it
				newParentVNode._nextDom = getDomSibling(oldParentVNode, i + 1);
			}

			unmount(oldChildren[i], oldChildren[i]);
		}
	}
}

/**
 * applies child refs
 */
export function applyChildRefs(refs) {
	// Set refs only after unmount
	if (refs) {
		for (let i = 0; i < refs.length; i++) {
			applyRef(refs[i], refs[++i], refs[++i]);
		}
	}
}

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
				oldDom = placeChild(
					parentDom,
					vnode,
					vnode,
					c,
					vnode._dom,
					oldDom
				);
			}
		}
	}

	return oldDom;
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
		children.some(child => {
			toChildArray(child, out);
		});
	} else {
		out.push(children);
	}
	return out;
}

function placeChild(
	parentDom,
	childVNode,
	oldVNode,
	oldChildren,
	newDom,
	oldDom
) {
	let nextDom;
	if (childVNode._nextDom !== undefined) {
		// Only Fragments or components that return Fragment like VNodes will
		// have a non-undefined _nextDom. Continue the diff from the sibling
		// of last DOM child of this child VNode
		nextDom = childVNode._nextDom;

		// Eagerly cleanup _nextDom. We don't need to persist the value because
		// it is only used by `diffChildren` to determine where to resume the diff after
		// diffing Components and Fragments. Once we store it the nextDOM local var, we
		// can clean up the property
		childVNode._nextDom = undefined;
	} else if (
		oldVNode == null ||
		newDom != oldDom ||
		newDom.parentNode == null
	) {
		outer: if (oldDom == null || oldDom.parentNode !== parentDom) {
			parentDom.appendChild(newDom);
			nextDom = null;
		} else {
			// `j<oldChildrenLength; j+=2` is an alternative to `j++<oldChildrenLength/2`
			for (
				let sibDom = oldDom, j = 0;
				(sibDom = sibDom.nextSibling) && j < oldChildren.length;
				j += 2
			) {
				if (sibDom == newDom) {
					break outer;
				}
			}
			parentDom.insertBefore(newDom, oldDom);
			nextDom = oldDom;
		}
	}

	// If we have pre-calculated the nextDOM node, use it. Else calculate it now
	// Strictly check for `undefined` here cuz `null` is a valid value of `nextDom`.
	// See more detail in create-element.js:createVNode
	if (nextDom !== undefined) {
		oldDom = nextDom;
	} else {
		oldDom = newDom.nextSibling;
	}

	return oldDom;
}
