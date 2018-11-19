import { diff, unmount } from './index';
import { coerceToVNode } from '../create-element';

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
 * @param {import('../internal').VNode} parentVNode Used to set `_lastDomChild`
 * pointer to keep track of our current position
 */
export function diffChildren(dom, children, oldChildren, context, isSvg, excessDomChildren, mounts, ancestorComponent, parentVNode) {
	let childVNode, i, j, p, index, oldVNode, newDom,
		oldChildrenLength = oldChildren.length,
		childDom = parentVNode.type===Fragment ? parentVNode._dom : dom.firstChild,
		nextDom, lastDom, sibDom, focus;

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
		newDom = diff(oldVNode==null ? null : oldVNode._dom, dom, childVNode, oldVNode, context, isSvg, false, excessDomChildren, mounts, ancestorComponent, parentVNode);

		// Only proceed if the vnode has not been unmounted by `diff()` above.
		if (childVNode!=null && newDom !=null) {
			lastDom = childVNode._lastDomChild;

			// Store focus in case moving children around changes it. Note that we
			// can't just check once for every tree, because we have no way to
			// differentiate wether the focus was reset by the user in a lifecycle
			// hook or by reordering dom nodes.
			focus = document.activeElement;

			// Fragments or similar components have already been diffed at this point.
			if (newDom!==lastDom) {}
			else if (oldVNode==null || newDom!=childDom || newDom.parentNode==null) {
				outer: if (childDom==null || childDom.parentNode!==dom) {
					dom.appendChild(newDom);
				}
				else {
					sibDom = childDom;
					j = 0;
					while ((sibDom=sibDom.nextSibling) && j++<oldChildrenLength/2) {
						if (sibDom===newDom) {
							oldChildren[index] = childDom._prevVNode;
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

			childDom = lastDom!=null ? lastDom.nextSibling : nextDom;
		}
	}

	// Remove children that are not part of any vnode. Only used by `hydrate`
	if (excessDomChildren!=null) for (i=excessDomChildren.length; i--; ) excessDomChildren[i].remove();

	// Remove remaining oldChildren if there are any.
	for (i=oldChildren.length; i--; ) if (oldChildren[i]!=null) unmount(oldChildren[i], ancestorComponent);
}
