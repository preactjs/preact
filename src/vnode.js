/**
 * Virtual DOM Node
 */
export function VNode(nodeName, opt_attributes, opt_children) {
	this.nodeName = nodeName;
	this.attributes = opt_attributes;
	this.children = opt_children;
	this.key = attributes && attributes.key;
}
