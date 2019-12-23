import { commit } from './index';

export const commitChildren = (vnode, q) => {
	// TODO: get parentDom
	// Iterate over updated children
	vnode._children.forEach(childVNode => {
		// Find old occurrence to justify reordering
		const newDom = commit(vnode, q);
		// Refs (?)

		// Insert dom-child
	});
};
