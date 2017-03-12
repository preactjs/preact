/**
 * Virtual DOM Node
 */
export function VNode(nodeName, opt_attributes, opt_children) {
	opt_attributes=opt_attributes||{};
	this.nodeName = nodeName;
	this.attributes = opt_attributes;
	this.children = opt_children||[];
	this.key = opt_attributes.key;
}
