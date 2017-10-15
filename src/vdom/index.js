import { extend } from '../util';


/** 
 * Check if two nodes are equivalent.
 * 
 * @param {Element} node the element node
 * 
 * @param {VNode} vnode the virtual node
 *
 * @param hyrdating
 *
 * @private
 */
export function isSameNodeType(node, vnode, hydrating) {
	if (typeof vnode==='string' || typeof vnode==='number') {
		return node.splitText!==undefined;
	}
	if (typeof vnode.nodeName==='string') {
		return !node._componentConstructor && isNamedNode(node, vnode.nodeName);
	}
	return hydrating || node._componentConstructor===vnode.nodeName;
}


/** 
 * Check if an Element has a given normalized name.
 *	
 * @param {Element} node the Element to check name for
 *	
 * @param {String} nodeName the normalized name
 */
export function isNamedNode(node, nodeName) {
	return node.normalizedNodeName===nodeName || node.nodeName.toLowerCase()===nodeName.toLowerCase();
}


/**
 * Reconstruct Component-style `props` from a VNode.
 * Ensures default/fallback values from `defaultProps`:
 * Own-properties of `defaultProps` not present in `vnode.attributes` are added.
 * 
 * @param {VNode} vnode
 * 
 * @returns {Object} props
 */
export function getNodeProps(vnode) {
	let props = extend({}, vnode.attributes);
	props.children = vnode.children;

	let defaultProps = vnode.nodeName.defaultProps;
	if (defaultProps!==undefined) {
		for (let i in defaultProps) {
			if (props[i]===undefined) {
				props[i] = defaultProps[i];
			}
		}
	}

	return props;
}
