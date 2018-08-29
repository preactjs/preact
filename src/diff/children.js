import { diff, unmount } from './index';
import { coerceToVNode } from '../create-element';

/**
 * Diff the children of a virtual node
 * @param {import('../internal').PreactElement} node The DOM element whose
 * children are being diffed
 * @param {Array<import('../internal').VNode>} children The new virtual
 * children
 * @param {Array<import('../internal').VNode>} oldChildren The old virtual
 * children
 * @param {object} context The current context object
 * @param {boolean} isSvg Whether or not this DOM node is an SVG node
 * @param {Array<import('../internal').PreactElement>} excessChildren
 * @param {Array<import('../internal').Component>} mounts The list of components
 * which have mounted
 * @param {import('../internal').Component} ancestorComponent The direct parent
 * component to the ones being diffed
 * @param {import('../internal').VNode} parentVNode Used to set `_lastSibling`
 * pointer to keep track of our current position
 */
export function diffChildren(node, children, oldChildren, context, isSvg, excessChildren, mounts, ancestorComponent, parentVNode) {
	let child, i, j, p, index, old, newEl,
		oldChildrenLength = oldChildren.length,
		childNode = typeof parentVNode.tag=='number' ? parentVNode._el : node.firstChild,
		next, last, sib;

	for (i=0; i<children.length; i++) {
		child = children[i] = coerceToVNode(children[i]);
		old = index = null;

		// Check if we find a corresponding element in oldChildren and store the
		// index where the element was found.
		p = oldChildren[i];
		if (p != null && (child.key==null ? (child.tag === p.tag) : (child.key === p.key))) {
			index = i;
		}
		else {
			for (j=0; j<oldChildrenLength; j++) {
				p = oldChildren[j];
				if (p!=null) {
					if (child.key==null ? (child.tag === p.tag) : (child.key === p.key)) {
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
			old = oldChildren[index];
			oldChildren[index] = null;
		}

		next = childNode!=null && childNode.nextSibling;

		// Morph the old element into the new one, but don't append it to the dom yet
		newEl = diff(old==null ? null : old._el, node, child, old, context, isSvg, false, excessChildren, mounts, ancestorComponent, parentVNode);

		// Only proceed if the vnode has not been unmounted by `diff()` above.
		if (child!=null && newEl !=null) {
			last = child._lastSibling;

			// Fragments or similar components have already been diffed at this point.
			if (newEl!==last) {}
			else if (old==null || newEl!=childNode || newEl.parentNode==null) {
				outer: if (childNode==null || childNode.parentNode!==node) {
					node.appendChild(newEl);
				}
				else {
					sib = childNode;
					j = 0;
					while ((sib=sib.nextSibling) && j++<oldChildrenLength/2) {
						if (sib===newEl) {
							oldChildren[index] = childNode._previousVTree;
							break outer;
						}
					}
					node.insertBefore(newEl, childNode);
				}
			}

			childNode = last!=null ? last.nextSibling : next;
		}
	}

	// Remove children that are not part of any vnode. Only used by `hydrate`
	if (excessChildren!=null) for (i=excessChildren.length; i--; ) if (excessChildren[i]!=null) excessChildren[i].remove();

	// Remove remaining oldChildren if there are any.
	for (i=oldChildren.length; i--; ) if (oldChildren[i]!=null) unmount(oldChildren[i], ancestorComponent);
}
