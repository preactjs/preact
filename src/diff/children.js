import { diff, unmount } from './index';
import { coerceToVNode, Fragment } from '../create-element';
import { EMPTY_OBJ, EMPTY_ARR } from '../constants';
import { removeNode } from '../util';

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
 * @param {Array<import('../internal').Component>} mounts The list of components
 * which have mounted
 * @param {import('../internal').Component} ancestorComponent The direct parent
 * component to the ones being diffed
 * @param {Node | Text} oldDom The current attached DOM
 * element any new dom elements should be placed around. Likely `null` on first
 * render (except when hydrating). Can be a sibling DOM element when diffing
 * Fragments that have siblings. In most cases, it starts out as `oldChildren[0]._dom`.
 */
export function diffChildren(parentDom, newParentVNode, oldParentVNode, context, isSvg, excessDomChildren, mounts, ancestorComponent, oldDom) {
	let childVNode, i, j, oldVNode, newDom, sibDom, firstChildDom;

	// TODO: Consider moving the setting of _children to the caller. Component's will predefine _children, and once Fragments collapse to just be
	// Component's (will need Fragment to return props.children), only DOM VNodes won't predefine _children
	let newChildren = newParentVNode._children || toChildArray(newParentVNode.props.children, newParentVNode._children=[], coerceToVNode, true);
	// This is a compression of oldParentVNode!=null && oldParentVNode != EMPTY_OBJ && oldParentVNode._children || EMPTY_ARR
	// as EMPTY_OBJ._children should be `undefined`.
	let oldChildren = (oldParentVNode && oldParentVNode._children) || EMPTY_ARR;

	let oldChildrenLength = oldChildren.length;

	// Only in very specific places should this logic be invoked (top level `render` and `diffElementNodes`).
	// I'm using `EMPTY_OBJ` to signal when `diffChildren` is invoked in these situations. I can't use `null`
	// for this purpose, because `null` is a valid value for `oldDom` which can mean to skip to this logic
	// (e.g. if mounting a new tree in which the old DOM should be ignored (usually for Fragments).
	// TODO: Consider moving this logic into callers of `diffChildren`.
	if (oldDom == EMPTY_OBJ) {
		oldDom = null;
		if (excessDomChildren!=null) {
			for (i = 0; !oldDom && i < excessDomChildren.length; i++) {
				oldDom = excessDomChildren[i];
			}
		}
		else {
			for (i = 0; !oldDom && i < oldChildrenLength; i++) {
				oldDom = oldChildren[i] && oldChildren[i]._dom;
			}
		}
	}

	for (i=0; i<newChildren.length; i++) {
		childVNode = newChildren[i] = coerceToVNode(newChildren[i]);

		if (childVNode!=null) {
			// Check if we find a corresponding element in oldChildren.
			// If found, delete the array item by setting to `undefined`.
			// We use `undefined`, as `null` is reserved for empty placeholders
			// (holes).
			oldVNode = oldChildren[i];

			if (oldVNode===null || (oldVNode && childVNode.key == oldVNode.key && childVNode.type === oldVNode.type)) {
				oldChildren[i] = undefined;
			}
			else {
				// Either oldVNode === undefined or oldChildrenLength > 0,
				// so after this loop oldVNode == null or oldVNode is a valid value.
				for (j=0; j<oldChildrenLength; j++) {
					oldVNode = oldChildren[j];
					// If childVNode is unkeyed, we only match similarly unkeyed nodes, otherwise we match by key.
					// We always match by type (in either case).
					if (oldVNode && childVNode.key == oldVNode.key && childVNode.type === oldVNode.type) {
						oldChildren[j] = undefined;
						break;
					}
					oldVNode = null;
				}
			}

			// Morph the old element into the new one, but don't append it to the dom yet
			newDom = diff(parentDom, childVNode, oldVNode, context, isSvg, excessDomChildren, mounts, ancestorComponent, null, oldDom);

			// Only proceed if the vnode has not been unmounted by `diff()` above.
			if (newDom!=null) {
				if (childVNode._lastDomChild != null) {
					// Only Fragments or components that return Fragment like VNodes will
					// have a non-null _lastDomChild. Continue the diff from the end of
					// this Fragment's DOM tree.
					newDom = childVNode._lastDomChild;
				}
				else if (excessDomChildren==oldVNode || newDom!=oldDom || newDom.parentNode==null) {
					// NOTE: excessDomChildren==oldVNode above:
					// This is a compression of excessDomChildren==null && oldVNode==null!
					// The values only have the same type when `null`.

					outer: if (oldDom==null || oldDom.parentNode!==parentDom) {
						parentDom.appendChild(newDom);
					}
					else {
						// `j<oldChildrenLength; j+=2` is an alternative to `j++<oldChildrenLength/2`
						for (sibDom=oldDom, j=0; (sibDom=sibDom.nextSibling) && j<oldChildrenLength; j+=2) {
							if (sibDom==newDom) {
								break outer;
							}
						}
						parentDom.insertBefore(newDom, oldDom);
					}
				}

				oldDom = newDom.nextSibling;

				if (firstChildDom == null) {
					firstChildDom = newDom;
				}
			}
		}
	}

	// newParentVNode._lastDomChild = newDom; // ?
	newParentVNode._dom = firstChildDom;

	// Remove children that are not part of any vnode.
	if (excessDomChildren!=null && typeof newParentVNode.type == 'string') for (i=excessDomChildren.length; i--; ) if (excessDomChildren[i]!=null) removeNode(excessDomChildren[i]);

	// Remove remaining oldChildren if there are any.
	// TODO: Consider inlining the implementation of unmount here
	for (i=oldChildrenLength; i--; ) if (oldChildren[i]!=null) unmount(oldChildren[i], ancestorComponent);
}

/**
 * Flatten a virtual nodes children to a single dimensional array
 * @param {import('../index').ComponentChildren} children The unflattened
 * children of a virtual node
 * @param {Array<import('../internal').VNode | null>} [flattened] An flat array of children to modify
 * @param {typeof import('../create-element').coerceToVNode} [map] Function that
 * will be applied on each child if the `vnode` is not `null`
 * @param {boolean} [keepHoles] wether to coerce `undefined` to `null` or not.
 * This is needed for Components without children like `<Foo />`.
 */
export function toChildArray(children, flattened, map, keepHoles) {
	if (flattened == null) flattened = [];
	if (children==null || typeof children === 'boolean') {
		if (keepHoles) flattened.push(null);
	}
	else if (Array.isArray(children)) {
		for (let i=0; i < children.length; i++) {
			toChildArray(children[i], flattened, map, keepHoles);
		}
	}
	else {
		flattened.push(map ? map(children) : children);
	}

	return flattened;
}
