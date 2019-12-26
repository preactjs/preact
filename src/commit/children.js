import { commit } from './index';
import { unmount } from '../diff';

export const commitChildren = (parentDom, vnode, q) => {
	// TODO: get parentDom
	// Iterate over updated children
	(vnode._children || []).forEach(childVNode => {
		// Find old occurrence to justify reordering
		const newDom = commit(parentDom, childVNode, q);
		const oldDom = vnode._dom;
		// Refs (?)
		if (!oldDom) {
			parentDom.appendChild(newDom);
		}
	});

	if (vnode._toRemove) {
		vnode._toRemove.forEach(v => {
			unmount(v, vnode);
		});
	}
};
