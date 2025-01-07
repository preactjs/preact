import 'preact/compat';

import { options } from 'preact';

const oldVNode = options.vnode;
options.vnode = vnode => {
	if (typeof vnode.type === 'function') {
		vnode.type._forwarded = true;
	}

	if (oldVNode) oldVNode(vnode);
};
