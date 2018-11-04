import { diff, unmount } from './index';
import { coerceToVNode } from '../create-element';

/**
 * Diff the children of a virtual node
 * @param {import('../internal').PreactElement} dom The DOM element whose
 * children are being diffed
 * @param {Array<import('../internal').VNode>} newVNodeChildren The new virtual
 * children
 * @param {Array<import('../internal').VNode>} oldVNodeChildren The old virtual
 * children
 * @param {object} context The current context object
 * @param {boolean} isSvg Whether or not this DOM node is an SVG node
 * @param {Array<import('../internal').PreactElement>} excessDomChildren
 * @param {Array<import('../internal').Component>} mounts The list of components
 * which have mounted
 * @param {import('../internal').Component} ancestorComponent The direct parent
 * component to the ones being diffed
 * @param {import('../internal').VNode} parentVNode Used to set `_lastSibling`
 * pointer to keep track of our current position
 */
export function diffChildren(dom, newVNodeChildren, oldVNodeChildren, context, isSvg, excessDomChildren, mounts, ancestorComponent, parentVNode) {
	let childVNode, i, j, p, index, oldVNode, newDom,
		oldChildrenLength = oldVNodeChildren.length,
		childDom = typeof parentVNode.type=='number' ? parentVNode._dom : dom.firstChild,
		nextDom, lastDom, sibDom;

	for (i=0; i<newVNodeChildren.length; i++) {
		childVNode = newVNodeChildren[i] = coerceToVNode(newVNodeChildren[i]);
		oldVNode = index = null;

		// Check if we find a corresponding element in oldChildren and store the
		// index where the element was found.
		p = oldVNodeChildren[i];
		if (p != null && (childVNode.key==null && p.key==null ? (childVNode.type === p.type) : (childVNode.key === p.key))) {
			index = i;
		}
		else {
			for (j=0; j<oldChildrenLength; j++) {
				p = oldVNodeChildren[j];
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
			oldVNode = oldVNodeChildren[index];
			oldVNodeChildren[index] = null;
		}

		nextDom = childDom!=null && childDom.nextSibling;

		// Morph the old element into the new one, but don't append it to the dom yet
		newDom = diff(oldVNode==null ? null : oldVNode._dom, dom, childVNode, oldVNode, context, isSvg, false, excessDomChildren, mounts, ancestorComponent, parentVNode);

		// Only proceed if the vnode has not been unmounted by `diff()` above.
		if (childVNode!=null && newDom !=null) {
			lastDom = childVNode._lastSibling;

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
							oldVNodeChildren[index] = childDom._previousVNode;
							break outer;
						}
					}
					dom.insertBefore(newDom, childDom);
				}
			}

			childDom = lastDom!=null ? lastDom.nextSibling : nextDom;
		}
	}

	// Remove children that are not part of any vnode. Only used by `hydrate`
	if (excessDomChildren!=null) for (i=excessDomChildren.length; i--; ) excessDomChildren[i].remove();

	// Remove remaining oldChildren if there are any.
	for (i=oldVNodeChildren.length; i--; ) if (oldVNodeChildren[i]!=null) unmount(oldVNodeChildren[i], ancestorComponent);
}
