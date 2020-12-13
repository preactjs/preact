import { diff, applyRef } from './index';
import { createVNode, Fragment } from '../create-element';
import { EMPTY_OBJ, EMPTY_ARR, FLAG_UNMOUNT } from '../constants';
import { removeNode } from '../util';
import { getDomSibling } from '../component';
import { normalizeVNode } from './shared';

/**
 * Diff the children of a virtual node
 * @param {import('../internal').PreactElement} parentDom The DOM element whose
 * children are being diffed
 * @param {import('../index').ComponentChildren[]} renderResult
 * @param {import('../internal').VNode} newParentVNode The new virtual
 * node whose children should be diff'ed against oldParentVNode
 * @param {import('../internal').VNode} oldParentVNode The old virtual
 * node whose children should be diff'ed against newParentVNode
 * @param {object} globalContext The current context object - modified by getChildContext
 * @param {boolean} isSvg Whether or not this DOM node is an SVG node
 * @param {Array<import('../internal').PreactElement>} excessDomChildren
 * @param {Array<import('../internal').Component>} commitQueue List of components
 * which have callbacks to invoke in commitRoot
 * @param {Array<import('../internal').Component>} unmountQueue List of components
 * which have callbacks to invoke in commitRoot
 * @param {any[]} refs
 * @param {Node | Text} oldDom The current attached DOM
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
	unmountQueue,
	refs,
	oldDom,
	isHydrating
) {
	let i, j, oldVNode, childVNode, newDom, firstChildDom;

	// This is a compression of oldParentVNode!=null && oldParentVNode != EMPTY_OBJ && oldParentVNode._children || EMPTY_ARR
	// as EMPTY_OBJ._children should be `undefined`.
	let oldChildren = (oldParentVNode && oldParentVNode._children) || EMPTY_ARR;

	let oldChildrenLength = oldChildren.length;

	// Only in very specific places should this logic be invoked (top level `render` and `diffElementNodes`).
	// I'm using `EMPTY_OBJ` to signal when `diffChildren` is invoked in these situations. I can't use `null`
	// for this purpose, because `null` is a valid value for `oldDom` which can mean to skip to this logic
	// (e.g. if mounting a new tree in which the old DOM should be ignored (usually for Fragments).
	if (oldDom == EMPTY_OBJ) {
		if (excessDomChildren != null) {
			oldDom = excessDomChildren[0];
		} else if (oldChildrenLength) {
			oldDom = getDomSibling(oldParentVNode, 0);
		} else {
			oldDom = null;
		}
	}

	newParentVNode._children = [];
	for (i = 0; i < renderResult.length; i++) {
		childVNode = newParentVNode._children[i] = normalizeVNode(
			renderResult[i],
			newParentVNode
		);

		// Terser removes the `continue` here and wraps the loop body
		// in a `if (childVNode) { ... } condition
		if (childVNode == null) {
			continue;
		}

		// Check if we find a corresponding element in oldChildren.
		// If found, delete the array item by setting to `undefined`.
		// We use `undefined`, as `null` is reserved for empty placeholders
		// (holes).
		oldVNode = oldChildren[i];

		if (
			oldVNode === null ||
			(oldVNode &&
				childVNode.key == oldVNode.key &&
				childVNode.type === oldVNode.type)
		) {
			oldChildren[i] = undefined;
		} else {
			// Either oldVNode === undefined or oldChildrenLength > 0,
			// so after this loop oldVNode == null or oldVNode is a valid value.
			for (j = 0; j < oldChildrenLength; j++) {
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

		oldVNode = oldVNode || EMPTY_OBJ;

		// Morph the old element into the new one, but don't append it to the dom yet
		diff(
			parentDom,
			childVNode,
			oldVNode,
			globalContext,
			isSvg,
			excessDomChildren,
			commitQueue,
			unmountQueue,
			refs,
			oldDom,
			isHydrating
		);

		newDom = childVNode._dom;

		if ((j = childVNode.ref) && oldVNode.ref != j) {
			if (!refs) refs = [];
			if (oldVNode.ref) refs.push(oldVNode.ref, null, childVNode);
			refs.push(j, true, childVNode);
		}

		if (newDom != null) {
			if (firstChildDom == null) {
				firstChildDom = newDom;
			}
		} else if (
			oldDom &&
			oldVNode._dom == oldDom &&
			oldDom.parentNode != parentDom
		) {
			// The above condition is to handle null placeholders. See test in placeholder.test.js:
			// `efficiently replace null placeholders in parent rerenders`
			oldDom = getDomSibling(oldVNode);
		}
	}

	newParentVNode._dom = firstChildDom;

	// Remove children that are not part of any vnode.
	if (excessDomChildren != null && typeof newParentVNode.type != 'function') {
		for (i = excessDomChildren.length; i--; ) {
			if (excessDomChildren[i] != null) removeNode(excessDomChildren[i]);
		}
	}

	// Remove remaining oldChildren if there are any.
	for (i = oldChildrenLength; i--; ) {
		if (oldChildren[i] != null) {
			oldChildren[i]._flags |= FLAG_UNMOUNT;
			console.log(oldChildren.map((x, i) => x && x.type + ' ' + i));
			unmountQueue.push(oldChildren[i]);
		}
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
		children.some(child => {
			toChildArray(child, out);
		});
	} else {
		out.push(children);
	}
	return out;
}
