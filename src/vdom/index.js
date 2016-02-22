import { clone, toLowerCase, isFunction, isString, hasOwnProperty } from '../util';
import { isFunctionalComponent } from './functional-component';
import { getNodeType } from '../dom/index';


/** Check if two nodes are equivalent.
 *	@param {Element} node
 *	@param {VNode} vnode
 *	@private
 */
export function isSameNodeType(node, vnode) {
	if (isFunctionalComponent(vnode)) return true;
	let nodeName = vnode.nodeName;
	if (isFunction(nodeName)) return node._componentConstructor===nodeName;
	if (getNodeType(node)===3) return isString(vnode);
	return toLowerCase(node.nodeName)===nodeName;
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
