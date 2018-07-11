import { extend } from './util';
import { h } from './h';

/**
 * @typedef {import('./vnode').VNode} VNode
 */

/**
 * Clones the given VNode, optionally adding attributes/props and replacing its
 * children.
 * @param {VNode} vnode The virtual DOM element to clone
 * @param {object} props Attributes/props to add when cloning
 * @param {Array<VNode>} [rest] Any additional arguments will be used as replacement
 *  children.
 */
export function cloneElement(vnode, props) {
	return h(
		vnode.nodeName,
		extend(extend({}, vnode.attributes), props),
		arguments.length>2 ? [].slice.call(arguments, 2) : vnode.children
	);
}
