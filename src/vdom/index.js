import { clone, isString, toLowerCase, hasOwnProperty } from '../util';
import { isFunctionalComponent } from './functional-component';
import { getNodeType } from '../dom';


/** Check if two nodes are equivalent.
 *	@param {Element} node
 *	@param {VNode} vnode
 *	@private
 */
export function isSameNodeType(node, vnode) {
	if (isString(vnode)) return getNodeType(node)===3;
	let nodeName = vnode.nodeName,
		type = typeof nodeName;
	if (type==='string') {
		return node.normalizedNodeName===nodeName || isNamedNode(node, nodeName);
	}
	if (type==='function') {
		return node._componentConstructor===nodeName || isFunctionalComponent(vnode);
	}
}


export function isNamedNode(node, nodeName) {
	return toLowerCase(node.nodeName)===toLowerCase(nodeName);
}


/**
 * Reconstruct Component-style `props` from a VNode.
 * Ensures default/fallback values from `defaultProps`:
 * Own-properties of `defaultProps` not present in `vnode.attributes` are added.
 * @param {VNode} vnode
 * @returns {Object} props
 */
export function getNodeProps(vnode) {
	let props = clone(vnode.attributes),
		c = vnode.children;
	if (c) props.children = c;

	let defaultProps = vnode.nodeName.defaultProps;
	if (defaultProps) {
		for (let i in defaultProps) {
			if (hasOwnProperty.call(defaultProps, i) && !(i in props)) {
				props[i] = defaultProps[i];
			}
		}
	}

	return props;
}
