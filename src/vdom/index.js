import { extend, isFunction, isString } from '../util';
import { isFunctionalComponent } from './functional-component';


/** Check if two nodes are equivalent.
 *	@param {Element} node
 *	@param {VNode} vnode
 *	@private
 */
export function isSameNodeType(node, vnode) {
	if (node.nodeType===3) return isString(vnode);
	if (isFunctionalComponent(vnode)) return true;
	let nodeName = vnode.nodeName;
	if (isFunction(nodeName)) return node._componentConstructor===nodeName;
	return node.nodeName.toLowerCase()===nodeName;
}



/** Reconstruct Component-style `props` from a VNode
 *	@todo: determine if it would be acceptible to drop the extend() clone here for speed
 *	@private
 */
export function getNodeProps(vnode) {
	let props = extend({}, vnode.attributes);
	if (vnode.children) {
		props.children = vnode.children;
	}
	return props;
}
