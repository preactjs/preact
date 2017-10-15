import { extend } from './util';
import { h } from './h';

/**
 * The method is used to clone a given virtual node with
 * the given properties.
 * 
 * @param {VNode} vnode the virutal node to clone
 *
 * @param props the attributes/properties to add to the
 * clone node
 *
 * Note: the function accepts additional arguments that are
 * added as the children of the cloned node if present. If no
 * additional arguments to the method call are provided, any
 * children to the provided virtual node are added to the cloned
 * node.
 */
export function cloneElement(vnode, props) {
	return h(
		vnode.nodeName,
		extend(extend({}, vnode.attributes), props),
		arguments.length>2 ? [].slice.call(arguments, 2) : vnode.children
	);
}
