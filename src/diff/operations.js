import { getDomSibling } from '../component';
import { isArray } from '../util';

/**
 * @param {import('../internal').VNode} parentVNode
 * @param {import('../internal').PreactElement} oldDom
 * @param {import('../internal').PreactElement} parentDom
 * @returns {import('../internal').PreactElement}
 */
export function insert(parentVNode, oldDom, parentDom) {
	// Note: VNodes in nested suspended trees may be missing _children.

	if (typeof parentVNode.type == 'function') {
		let children = parentVNode._children;
		for (let i = 0; children && i < children.length; i++) {
			if (children[i]) {
				// If we enter this code path on sCU bailout, where we copy
				// oldVNode._children to newVNode._children, we need to update the old
				// children's _parent pointer to point to the newVNode (parentVNode
				// here).
				children[i]._parent = parentVNode;
				oldDom = insert(children[i], oldDom, parentDom);
			}
		}

		return oldDom;
	} else if (parentVNode._dom != oldDom) {
		if (oldDom && parentVNode.type && !parentDom.contains(oldDom)) {
			oldDom = getDomSibling(parentVNode);
		}
		parentDom.insertBefore(parentVNode._dom, oldDom || null);
		oldDom = parentVNode._dom;
	}

	do {
		oldDom = oldDom && oldDom.nextSibling;
	} while (oldDom != null && oldDom.nodeType === 8);

	return oldDom;
}

/**
 * Flatten and loop through the children of a virtual node
 * @param {import('../internal').ComponentChildren} children The unflattened children of a virtual
 * node
 * @returns {import('../internal').VNode[]}
 */
export function toChildArray(children, out) {
	out = out || [];
	if (children == null || typeof children == 'boolean') {
	} else if (isArray(children)) {
		children.some(child => {
			toChildArray(child, out);
		});
	} else {
		out.push(children);
	}
	return out;
}
