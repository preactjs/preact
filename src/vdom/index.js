import { extend } from '../util';
import { isFunctionalComponent } from './functional-component';


/** Check if two nodes are equivalent.
 *	@param {Element} node
 *	@param {VNode} vnode
 *	@private
 */
export function isSameNodeType(node, vnode) {
	if (node.nodeType===3) {
		return typeof vnode==='string';
	}
	if (isFunctionalComponent(vnode)) return true;
	let nodeName = vnode.nodeName;
	if (typeof nodeName==='function') return node._componentConstructor===nodeName;
	return node.nodeName.toLowerCase()===nodeName;
}



/** Reconstruct Component-style `props` from a VNode
 *	@private
 */
export function getNodeProps(vnode) {
	let props = extend({}, vnode.attributes);
	if (vnode.children) {
		props.children = vnode.children;
	}
	return props;
}
