import { Component, options } from 'preact';

export default function LooseMode() {}

LooseMode.prototype = new Component();

let oldVnodeHook = false;
LooseMode.prototype.componentDidMount = function () {
	if (oldVnodeHook === false) {
		oldVnodeHook = options.vnode;
		options.vnode = vnode => {
			vnode.nodeName = vnode.type;
			vnode.attributes = vnode.props;
			vnode.children = vnode.props.children;
			if (oldVnodeHook) oldVnodeHook(vnode);
		};
	}
};

LooseMode.prototype.render = function(props) {
	return props.children;
};
