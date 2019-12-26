import { diff, unmount, applyRef } from './index';
import { createVNode } from '../create-element';
import { EMPTY_OBJ, EMPTY_ARR } from '../constants';
import { removeNode } from '../util';
import { getDomSibling } from '../component';

/**
 * Diff the children of a virtual node
 * @param {import('../internal').PreactElement} parentDom The DOM element whose
 * children are being diffed
 * @param {import('../internal').VNode} newParentVNode The new virtual
 * node whose children should be diff'ed against oldParentVNode
 * @param {import('../internal').VNode} oldParentVNode The old virtual
 * node whose children should be diff'ed against newParentVNode
 * @param {object} context The current context object
 * @param {boolean} isSvg Whether or not this DOM node is an SVG node
 * @param {Array<import('../internal').PreactElement>} excessDomChildren
 * @param {Node | Text} oldDom The current attached DOM
 * element any new dom elements should be placed around. Likely `null` on first
 * render (except when hydrating). Can be a sibling DOM element when diffing
 * Fragments that have siblings. In most cases, it starts out as `oldChildren[0]._dom`.
 * @param {boolean} isHydrating Whether or not we are in hydration
 */
export function diffChildren(
	parentDom,
	newParentVNode,
	oldParentVNode,
	context,
	isSvg,
	excessDomChildren,
	oldDom,
	isHydrating
) {
	let i, j, oldVNode, newDom, firstChildDom, refs;

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

	i = 0;
	newParentVNode._children = toChildArray(
		newParentVNode._children,
		childVNode => {
			if (childVNode != null) {
				childVNode._parent = newParentVNode;
				childVNode._depth = newParentVNode._depth + 1;

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
				childVNode._dom = diff(
					parentDom,
					childVNode,
					oldVNode,
					context,
					isSvg,
					excessDomChildren,
					oldDom,
					isHydrating
				);

				if ((j = childVNode.ref) && oldVNode.ref != j) {
					if (!refs) refs = [];
					if (oldVNode.ref) refs.push(oldVNode.ref, null, childVNode);
					refs.push(j, childVNode._component || newDom, childVNode);
				}
			}

			i++;
			return childVNode;
		}
	);

	newParentVNode._dom = firstChildDom;

	// Remove children that are not part of any vnode.
	if (excessDomChildren != null && typeof newParentVNode.type !== 'function') {
		for (i = excessDomChildren.length; i--; ) {
			if (excessDomChildren[i] != null) removeNode(excessDomChildren[i]);
		}
	}

	// Remove remaining oldChildren if there are any.
	newParentVNode._toRemove = oldChildren.filter(c => c != null);
}

/**
 * Flatten and loop through the children of a virtual node
 * @param {import('../index').ComponentChildren} children The unflattened
 * children of a virtual node
 * @param {(vnode: import('../internal').VNode) => import('../internal').VNode} [callback]
 * A function to invoke for each child before it is added to the flattened list.
 * @param {Array<import('../internal').VNode | string | number>} [flattened] An flat array of children to modify
 * @returns {import('../internal').VNode[]}
 */
export function toChildArray(children, callback, flattened) {
	if (flattened == null) flattened = [];

	if (children == null || typeof children === 'boolean') {
		if (callback) flattened.push(callback(null));
	} else if (Array.isArray(children)) {
		for (let i = 0; i < children.length; i++) {
			toChildArray(children[i], callback, flattened);
		}
	} else if (!callback) {
		flattened.push(children);
	} else if (typeof children === 'string' || typeof children === 'number') {
		flattened.push(callback(createVNode(null, children, null, null)));
	} else if (children._dom != null || children._component != null) {
		flattened.push(
			callback(createVNode(children.type, children.props, children.key, null))
		);
	} else {
		flattened.push(callback(children));
	}

	return flattened;
}
