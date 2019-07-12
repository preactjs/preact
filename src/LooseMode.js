import { Component, options } from 'preact';

export default function LooseMode() {}

LooseMode.prototype = new Component();

LooseMode.prototype.componentDidMount = function() {
	let oldVnodeHook = options.vnode;
	options.vnode = vnode => {
		vnode.nodeName = vnode.type;
		vnode.attributes = vnode.props;
		vnode.children = vnode.props.children;
		if (oldVnodeHook) oldVnodeHook(vnode);
	};
};

LooseMode.prototype.render = function(props) {
	return props.children;
};
