import all from 'preact/compat';

import { options } from 'preact';

const oldVNode = options.vnode;
options.vnode = vnode => {
	if (typeof vnode.type === 'function' && vnode.ref) {
		vnode.type.__f = true;
	}

	if (oldVNode) oldVNode(vnode);
};

export default all;
export * from 'preact/compat';
