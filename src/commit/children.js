import { commit } from './index';
import { unmount } from '../diff';

export const commitChildren = (parentDom, vnode, q) => {
	let firstChildDom, sibDom, j;
	// Iterate over updated children
	(vnode._children || []).forEach(childVNode => {
		// Find old occurrence to justify reordering
		const oldDom = childVNode._dom;
		let newDom = commit(parentDom, childVNode, q);

		if (newDom != null) {
			if (firstChildDom == null) {
				firstChildDom = newDom;
			}

			if (childVNode._lastDomChild != null) {
				newDom = childVNode._lastDomChild;
				childVNode._lastDomChild = null;
			} else if (newDom != oldDom || newDom.parentNode == null) {
				outer: if (oldDom == null || oldDom.parentNode !== parentDom) {
					parentDom.appendChild(newDom);
				} else {
					for (
						sibDom = oldDom, j = 0;
						(sibDom = sibDom.nextSibling); // && j < oldChildrenLength;
						j += 2
					) {
						if (sibDom == newDom) {
							break outer;
						}
					}
					parentDom.insertBefore(newDom, oldDom);
				}

				if (vnode.type == 'option') {
					parentDom.value = '';
				}
			}

			if (typeof vnode.type == 'function') {
				vnode._lastDomChild = newDom;
			}
		}

		childVNode._dom = newDom;
	});

	if (vnode._toRemove) {
		vnode._toRemove.forEach(v => {
			unmount(v, vnode);
		});
	}
};
