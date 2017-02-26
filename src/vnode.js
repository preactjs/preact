/**
 * Virtual DOM Node
 * @constructor
 * @param {string|Function} nodeName
 * @param {Object|undefined} attributes
 * @param {Array<VNode>|undefined} children
 */
export function VNode(nodeName, attributes, children) {
	this.nodeName = nodeName;
	this.attributes = attributes;
	this.children = children;
	this.key = attributes && attributes.key;
}
