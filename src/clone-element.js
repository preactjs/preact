import { h } from './h';

/**
 * Clones the given VNode, optionally adding attributes/props and replacing its children.
 * @param {VNode} vnode		The virtual DOM element to clone
 * @param {Object} props	Attributes/props to add when cloning
 * @param {VNode} rest		Any additional arguments will be used as replacement children.
 */
export const cloneElement = (vnode, props, ...rest) =>
	h(
		vnode.nodeName,
		Object.assign({}, vnode.attributes, props),
		rest.length ? rest : vnode.children
	);
