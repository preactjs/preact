import { diff, unmount } from './index';
import { coerceToVNode, Fragment } from '../create-element';

/**
 * Diff the children of a virtual node
 * @param {import('../internal').PreactElement} dom The DOM element whose
 * children are being diffed
 * @param {Array<import('../internal').VNode>} children The new virtual
 * children
 * @param {Array<import('../internal').VNode>} oldChildren The old virtual
 * children
 * @param {object} context The current context object
 * @param {boolean} isSvg Whether or not this DOM node is an SVG node
 * @param {Array<import('../internal').PreactElement>} excessDomChildren
 * @param {Array<import('../internal').Component>} mounts The list of components
 * which have mounted
 * @param {import('../internal').Component} ancestorComponent The direct parent
 * component to the ones being diffed
 * @param {import('../internal').VNode} parentVNode TODO: Is this still needed?
 */
export function diffChildren(dom, children, oldChildren, context, isSvg, excessDomChildren, mounts, ancestorComponent, parentVNode) {
	let childVNode, i, j, p, index, oldVNode, newDom,
		oldChildrenLength = oldChildren.length,
		nextDom, sibDom, focus,
		childDom;

	// 3163 B
	// if (parentVNode.type === Fragment) {
	// 	if (excessDomChildren!=null) {
	// 		for (i = 0; i < excessDomChildren.length; i++) {
	// 			if (excessDomChildren[i]!=null) {
	// 				childDom = excessDomChildren[i];
	// 				break;
	// 			}
	// 		}
	// 	}
	// 	else if (oldChildren[0] != null) {
	// 		childDom = oldChildren[0]._dom;
	// 	}
	// 	else {
	// 		childDom = null;
	// 	}
	// }
	// else {
	// 	childDom = dom.firstChild;
	// }

	// 3161 B
	// if (parentVNode.type !== Fragment) {
	// 	childDom = dom.firstChild;
	// }
	// else if (oldChildren[0] != null) {
	// 	childDom = oldChildren[0]._dom;
	// }
	// else if (excessDomChildren!=null) {
	// 	for (i = 0; i < excessDomChildren.length; i++) {
	// 		if (excessDomChildren[i]!=null) {
	// 			childDom = excessDomChildren[i];
	// 			break;
	// 		}
	// 	}
	// }

	// 3149 B
	childDom = oldChildren.length ? oldChildren[0] && oldChildren[0]._dom : null;
	if (excessDomChildren!=null) {
		for (i = 0; i < excessDomChildren.length; i++) {
			if (excessDomChildren[i]!=null) {
				childDom = excessDomChildren[i];
				break;
			}
		}
	}

	for (i=0; i<children.length; i++) {
		childVNode = children[i] = coerceToVNode(children[i]);
		oldVNode = index = null;

		// Check if we find a corresponding element in oldChildren and store the
		// index where the element was found.
		p = oldChildren[i];
		if (p != null && (childVNode.key==null && p.key==null ? (childVNode.type === p.type) : (childVNode.key === p.key))) {
			index = i;
		}
		else {
			for (j=0; j<oldChildrenLength; j++) {
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
		if (index!=null) {
			oldVNode = oldChildren[index];
			oldChildren[index] = null;
		}

		nextDom = childDom!=null && childDom.nextSibling;

		// Morph the old element into the new one, but don't append it to the dom yet
		newDom = diff(oldVNode==null ? null : oldVNode._dom, dom, childVNode, oldVNode, context, isSvg, false, excessDomChildren, mounts, ancestorComponent);

		// Only proceed if the vnode has not been unmounted by `diff()` above.
		if (childVNode!=null && newDom !=null) {
			// Store focus in case moving children around changes it. Note that we
			// can't just check once for every tree, because we have no way to
			// differentiate wether the focus was reset by the user in a lifecycle
			// hook or by reordering dom nodes.
			focus = document.activeElement;

			// Fragments or similar components have already been diffed at this point.
			if (childVNode._lastDomChild != null) {
				newDom = childVNode._lastDomChild;
			}
			else if (excessDomChildren==oldVNode || newDom!=childDom || newDom.parentNode==null) {
				// NOTE: excessDomChildren==oldVNode above:
				// This is a compression of excessDomChildren==null && oldVNode==null!
				// The values only have the same type when `null`.

				outer: if (childDom==null || childDom.parentNode!==dom) {
					dom.appendChild(newDom);
				}
				else {
					sibDom = childDom;
					j = 0;
					while ((sibDom=sibDom.nextSibling) && j++<oldChildrenLength/2) {
						if (sibDom===newDom) {
							break outer;
						}
					}
					dom.insertBefore(newDom, childDom);
				}
			}

			// Restore focus if it was changed
			if (focus!==document.activeElement) {
				focus.focus();
			}

			childDom = newDom!=null ? newDom.nextSibling : nextDom;
		}
	}

	// Remove children that are not part of any vnode. Only used by `hydrate`
	if (excessDomChildren!=null && parentVNode.type!==Fragment) for (i=excessDomChildren.length; i--; ) if (excessDomChildren[i]!=null) excessDomChildren[i].remove();

	// Remove remaining oldChildren if there are any.
	for (i=oldChildren.length; i--; ) if (oldChildren[i]!=null) unmount(oldChildren[i], ancestorComponent);
}
