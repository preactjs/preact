import { clone, extend, isString, isFunction, toLowerCase } from '../util';
import { isFunctionalComponent } from './functional-component';
import { getNodeType } from '../dom/index';


/** Check if two nodes are equivalent.
 *	@param {Element} node
 *	@param {VNode} vnode
 *	@private
 */
export function isSameNodeType(node, vnode) {
	if (isString(vnode)) {
		return getNodeType(node)===3;
	}
	if (isString(vnode.nodeName)) {
		return isNamedNode(node, vnode.nodeName);
	}
	if (isFunction(vnode.nodeName)) {
		return node._componentConstructor===vnode.nodeName || isFunctionalComponent(vnode);
	}
}


export function isNamedNode(node, nodeName) {
	return node.normalizedNodeName===nodeName || toLowerCase(node.nodeName)===toLowerCase(nodeName);
}


/**
 * Reconstruct Component-style `props` from a VNode.
 * Ensures default/fallback values from `defaultProps`:
 * Own-properties of `defaultProps` not present in `vnode.attributes` are added.
 * @param {VNode} vnode
 * @returns {Object} props
 */
export function getNodeProps(vnode) {
	let defaultProps = vnode.nodeName.defaultProps,
		props = clone(defaultProps || vnode.attributes);

	if (defaultProps) extend(props, vnode.attributes);

	if (vnode.children) props.children = vnode.children;

	return props;
}
