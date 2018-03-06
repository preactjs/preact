import { extend } from './util';
import { h } from './h';

/**
 * Clones the given VNode, optionally adding attributes/props and replacing its children.
 * @param {VNode} vnode		The virtual DOM element to clone
 * @param {Object} props	Attributes/props to add when cloning
 */
export function cloneElement(vnode, props) {
	return h(
		vnode.nodeName,
		extend(extend({}, vnode.attributes), props),
		arguments.length>2 ? [].slice.call(arguments, 2) : vnode.children
	);
}
