import { extend } from '../util';


/** Check if two nodes are equivalent.
 *	@param {Element} node
 *	@param {VNode} vnode
 *	@private
 */
export function isSameNodeType(node, vnode, hydrating) {
	if (typeof vnode==='string' || typeof vnode==='number') {
		// return node instanceof Text;
		return node.splitText!==undefined;
		// return typeof node.data!=='undefined';
	}
	if (typeof vnode.nodeName==='string') {
	// if (isString(vnode.nodeName)) {
		return !node._componentConstructor && isNamedNode(node, vnode.nodeName);
		// return !node._componentConstructor && (node.normalizedNodeName || node.nodeName.toLowerCase())===vnode.nodeName;
	}
	return hydrating || node._componentConstructor===vnode.nodeName;
}


export function isNamedNode(node, nodeName) {
	// return node.normalizedNodeName===nodeName || toLowerCase(node.nodeName)===toLowerCase(nodeName);
	// return node.normalizedNodeName!==undefined ? node.normalizedNodeName===nodeName : node.nodeName.toLowerCase()===nodeName.toLowerCase();
	return node.normalizedNodeName===nodeName || node.nodeName.toLowerCase()===nodeName.toLowerCase();
	// return node.nodeName===nodeName.toUpperCase();
}


/**
 * Reconstruct Component-style `props` from a VNode.
 * Ensures default/fallback values from `defaultProps`:
 * Own-properties of `defaultProps` not present in `vnode.attributes` are added.
 * @param {VNode} vnode
 * @returns {Object} props
 */
export function getNodeProps(vnode) {
	let props = extend({}, vnode.attributes);
	props.children = vnode.children;

	// let props = { children: vnode.children };
	// extend(props, vnode.attributes);
	// for (let i in vnode.attributes) props[i] = vnode.attributes[i];

	let defaultProps = vnode.nodeName.defaultProps;
	if (defaultProps!==undefined) {
		for (let i in defaultProps) {
			if (props[i]===undefined) {
				props[i] = defaultProps[i];
			}
		}
	}

	return props;


	/*
	// let props = clone(vnode.attributes);
	let props = extend({}, vnode.attributes);
	props.children = vnode.children;

	let defaultProps = vnode.nodeName.defaultProps;
	if (defaultProps) {
		for (let i in defaultProps) {
			if (props[i]===undefined) {
				props[i] = defaultProps[i];
			}
		}
	}

	// if (vnode.nodeName.defaultProps!=null) {
	// 	for (let i in vnode.nodeName.defaultProps) {
	// 		if (props[i]===undefined) {
	// 			props[i] = vnode.nodeName.defaultProps[i];
	// 		}
	// 	}
	// }

	return props;
	*/
}
