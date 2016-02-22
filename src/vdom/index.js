import { clone, toLowerCase, isFunction, isString, extend, hasOwnProperty } from '../util';
import { isFunctionalComponent } from './functional-component';
import { getNodeType } from '../dom/index';


/** Check if two nodes are equivalent.
 *	@param {Element} node
 *	@param {VNode} vnode
 *	@private
 */
export function isSameNodeType(node, vnode) {
	if (getNodeType(node)===3) return isString(vnode);
	if (isFunctionalComponent(vnode)) return true;
	let nodeName = vnode.nodeName;
	if (isFunction(nodeName)) return node._componentConstructor===nodeName;
	return toLowerCase(node.nodeName)===nodeName;
}


/**
 * Update given props object with props from default props.
 * If props is exists in default (is not undefined) and is not
 * exists in given props object (is undefined) then prop from
 * defaults will be set in given prop object
 * @param {Object} component
 * @param {Object} props
 */
export function setDefaultProps(nodeName, props) {
	if (!isString(nodeName)) {
		// Get default props from cache or set a cache
		let defaultProps = nodeName.__defaultPropsCache;
		if (!defaultProps) {
			defaultProps = extend({}, nodeName.defaultProps || {});
			const defaultPropsGenerator = nodeName.prototype.getDefaultProps;
			if (defaultPropsGenerator) {
				extend(defaultProps, defaultPropsGenerator() || {});
			}
			nodeName.__defaultPropsCache = defaultProps;
		}

		// Merge props with given props object
		for (let k in defaultProps) {
			if (hasOwnProperty.call(defaultProps, k) && props[k] === undefined) {
				props[k] = defaultProps[k];
			}
		}
	}
}


/** Reconstruct Component-style `props` from a VNode
 *	@todo: determine if it would be acceptible to drop the extend() clone here for speed
 *	@private
 */
export function getNodeProps(vnode) {
	let props = clone(vnode.attributes),
		c = vnode.children;
	if (c) props.children = c;
	setDefaultProps(vnode.nodeName, props);
	return props;
}
