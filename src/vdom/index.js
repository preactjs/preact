import { extend, lowercase, root } from '../util';

const { HTMLElement } = root;


/** Check if two nodes are equivalent.
 *	@param {Element} node
 *	@param {VNode} vnode
 *	@private
 */
export function isSameNodeType(node, vnode, hydrating) {
	if (typeof vnode==='string' || typeof vnode==='number') {
		return node.splitText!==undefined;
	}
	const { _componentConstructor } = node;
	const { nodeName } = vnode;
	if (typeof nodeName==='string') {
		return !_componentConstructor && isSameNodeName(node, nodeName);
	}
	return hydrating || _componentConstructor===nodeName || isSameNodeConstructor(node, nodeName);
}


/** Check if an Element has a given normalized name.
 *	@param {Element} node
 *	@param {mixed} nodeName
 */
export function isSameNodeName(node, nodeName) {
	return node.normalizedNodeName===nodeName || lowercase(node.nodeName)===lowercase(nodeName);
}


/** Check if a node is the same via constructor.
 *  @param {Element} node
 *  @param {Function} nodeName
 */
export function isSameNodeConstructor({ constructor }, nodeName) {
	return constructor === nodeName;
}


/** Returns whether or not the provided node is a custom element.
 *  @param {HTMLElement} node
 */
export function isCustomElement ({ prototype }) {
	return prototype instanceof HTMLElement;
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
