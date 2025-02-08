const def = require('preact/compat');

const { options } = require('preact');

const oldVNode = options.vnode;
options.vnode = vnode => {
	if (typeof vnode.type === 'function' && vnode.ref) {
		vnode.type.__f = true;
	}

	if (oldVNode) oldVNode(vnode);
};

module.exports = def;
exports = def;
