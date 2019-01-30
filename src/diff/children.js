import { diff, unmount } from './index';
import { coerceToVNode, Fragment } from '../create-element';
import { EMPTY_OBJ, EMPTY_ARR } from '../constants';

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
 */
export function diffChildren(parentDom, newParentVNode, oldParentVNode, context, isSvg, excessDomChildren, mounts, ancestorComponent) {
	let childVNode, i, oldVNode, newDom, childDom;

	let newChildren = getVNodeChildren(newParentVNode);
	let oldChildren = oldParentVNode==null || oldParentVNode==EMPTY_OBJ ? EMPTY_ARR : getVNodeChildren(oldParentVNode);
	let newChildrenTodo = [newChildren];
	let oldChildrenTodo = [oldChildren];
	let indexesToResume = [0];

	childDom = oldChildren.length ? oldChildren[0] && oldChildren[0]._dom : null;
	if (excessDomChildren!=null) {
		for (i = 0; i < excessDomChildren.length; i++) {
			if (excessDomChildren[i]!=null) {
				childDom = excessDomChildren[i];
				break;
			}
		}
	}

	while (newChildrenTodo.length) {
		newChildren = newChildrenTodo.pop();
		oldChildren = oldChildrenTodo.pop();
		i = indexesToResume.pop();

		for (; i<newChildren.length; i++) {
			childVNode = newChildren[i] = coerceToVNode(newChildren[i]);
			oldVNode = getOldVNode(oldChildren, i, childVNode);

			if (childVNode != null && childVNode.type === Fragment) {
				newChildrenTodo.push(newChildren);
				oldChildrenTodo.push(oldChildren);
				indexesToResume.push(i + 1);

				newChildren = getVNodeChildren(childVNode);
				oldChildren = oldVNode == null ? EMPTY_ARR : oldVNode.type !== Fragment ? [oldVNode] : getVNodeChildren(oldVNode);
				i = -1; // Restart for loop at the beginning (the `i++` will make this 0 before the next iteration)
			}
			else {
				// Morph the old element into the new one, but don't append it to the dom yet
				newDom = diff(oldVNode==null ? null : oldVNode._dom, parentDom, childVNode, oldVNode, context, isSvg, excessDomChildren, mounts, ancestorComponent);

				// Only proceed if the vnode has not been unmounted by `diff()` above.
				if (childVNode!=null && newDom !=null) {
					childDom = placeChild(parentDom, oldVNode, childVNode, childDom, newDom, excessDomChildren, oldChildren.length);
				}
			}
		}

		// Remove remaining oldChildren if there are any.
		for (i=oldChildren.length; i--; ) if (oldChildren[i]!=null) unmount(oldChildren[i], ancestorComponent);
	}

	// for (i=0; i<children.length; i++) {
	// 	childVNode = children[i] = coerceToVNode(children[i]);
	// 	oldVNode = getOldVNode(oldChildren, i, childVNode);
	//
	// 	if (childVNode != null && childVNode.type === Fragment) {
	// 		const fragmentChildren = getVNodeChildren(childVNode);
	// 		const oldFragmentChildren = oldVNode == null ? EMPTY_ARR : oldVNode.type !== Fragment ? [oldVNode] : getVNodeChildren(oldVNode);
	//
	// 		// TOOD: Consider how to recurse...
	// 		for (let j = 0; j<fragmentChildren.length; j++) {
	// 			childVNode = fragmentChildren[j] = coerceToVNode(fragmentChildren[j]);
	// 			oldVNode = getOldVNode(oldFragmentChildren, j, childVNode);
	//
	// 			// Morph the old element into the new one, but don't append it to the dom yet
	// 			newDom = diff(oldVNode==null ? null : oldVNode._dom, dom, childVNode, oldVNode, context, isSvg, false, excessDomChildren, mounts, ancestorComponent, parentVNode);
	//
	// 			// Only proceed if the vnode has not been unmounted by `diff()` above.
	// 			if (childVNode!=null && newDom !=null) {
	// 				childDom = placeChild(dom, oldVNode, childVNode, childDom, newDom, excessDomChildren, oldChildren.length);
	// 			}
	// 		}
	// 	}
	// 	else {
	// 		// Morph the old element into the new one, but don't append it to the dom yet
	// 		newDom = diff(oldVNode==null ? null : oldVNode._dom, dom, childVNode, oldVNode, context, isSvg, false, excessDomChildren, mounts, ancestorComponent, parentVNode);
	//
	// 		// Only proceed if the vnode has not been unmounted by `diff()` above.
	// 		if (childVNode!=null && newDom !=null) {
	// 			childDom = placeChild(dom, oldVNode, childVNode, childDom, newDom, excessDomChildren, oldChildren.length);
	// 		}
	// 	}
	// }

	// Remove children that are not part of any vnode. Only used by `hydrate`
	if (excessDomChildren!=null && newParentVNode.type!==Fragment) for (i=excessDomChildren.length; i--; ) if (excessDomChildren[i]!=null) excessDomChildren[i].remove();

	// Remove remaining oldChildren if there are any.
	// for (i=oldChildren.length; i--; ) if (oldChildren[i]!=null) unmount(oldChildren[i], ancestorComponent);
}

function placeChild(parentDom, oldVNode, childVNode, childDom, newDom, excessDomChildren, oldChildrenLength) {
	let nextDom = childDom!=null && childDom.nextSibling;

	// Store focus in case moving children around changes it. Note that we
	// can't just check once for every tree, because we have no way to
	// differentiate wether the focus was reset by the user in a lifecycle
	// hook or by reordering dom nodes.
	let focus = document.activeElement;

	if (childVNode._lastDomChild != null) {
		// Only Fragments or components that return Fragment like VNodes will
		// have a non-null _lastDomChild. Continue the diff from the end of
		// this Fragment's DOM tree.
		newDom = childVNode._lastDomChild;
	}
	else if (excessDomChildren==oldVNode || newDom!=childDom || newDom.parentNode==null) {
		// NOTE: excessDomChildren==oldVNode above:
		// This is a compression of excessDomChildren==null && oldVNode==null!
		// The values only have the same type when `null`.

		outer: if (childDom==null || childDom.parentNode!==parentDom) {
			parentDom.appendChild(newDom);
		}
		else {
			let sibDom = childDom;
			let j = 0;
			while ((sibDom=sibDom.nextSibling) && j++<oldChildrenLength/2) {
				if (sibDom===newDom) {
					break outer;
				}
			}
			parentDom.insertBefore(newDom, childDom);
		}
	}

	// Restore focus if it was changed
	if (focus!==document.activeElement) {
		focus.focus();
	}

	return newDom!=null ? newDom.nextSibling : nextDom;
}

function getOldVNode(oldChildren, i, childVNode) {
	// Check if we find a corresponding element in oldChildren and store the
	// index where the element was found.
	let index = null;
	let p = oldChildren[i];
	if (p != null && (childVNode.key==null && p.key==null ? (childVNode.type === p.type) : (childVNode.key === p.key))) {
		index = i;
	}
	else {
		for (let j=0; j<oldChildren.length; j++) {
			p = oldChildren[j];
			if (p!=null) {
				if (childVNode.key==null && p.key==null ? (childVNode.type === p.type) : (childVNode.key === p.key)) {
					index = j;
					break;
				}
			}
		}
	}

	// If we have found a corresponding old element we store it in a variable
	// and delete it from the array. That way the next iteration can skip this
	// element.
	let oldVNode = null;
	if (index!=null) {
		oldVNode = oldChildren[index];
		oldChildren[index] = null;
	}

	return oldVNode;
}

/**
 * Get the children of a virtual node as a flat array
 * @param {import('../internal').VNode} vnode The virtual node to get the
 * children of
 * @returns {Array<import('../internal').VNode>} The virtual node's children
 */
function getVNodeChildren(vnode) {
	if (vnode._children==null) {
		toChildArray(vnode.props.children, vnode._children=[]);
	}
	return vnode._children;
}

/**
 * Flatten a virtual nodes children to a single dimensional array
 * @param {import('../index').ComponentChildren} children The unflattened
 * children of a virtual node
 * @param {Array<import('../internal').VNode | null>} [flattened] An flat array of children to modify
 */
export function toChildArray(children, flattened) {
	if (flattened == null) flattened = [];
	if (children==null || typeof children === 'boolean') {}
	else if (Array.isArray(children)) {
		for (let i=0; i < children.length; i++) {
			toChildArray(children[i], flattened);
		}
	}
	else {
		flattened.push(coerceToVNode(children));
	}

	return flattened;
}
