import { toLowerCase } from '../util';
import { ensureNodeData, getRawNodeAttributes, removeNode } from './index';

/** DOM node pool, keyed on nodeName. */

const nodes = {};

export function collectNode(node) {
	removeNode(node);

	if (node instanceof Element) {
		if (node[ATTR_KEY]) {
			ensureNodeData(node, getRawNodeAttributes(node));
		}
		node._component = node._componentConstructor = null;

		let name = node.normalizedNodeName || toLowerCase(node.nodeName);
		(nodes[name] || (nodes[name] = [])).push(node);
	}
}


export function createNode(nodeName, isSvg) {
	let name = toLowerCase(nodeName),
		node = nodes[name] && nodes[name].pop() || (isSvg ? document.createElementNS('http://www.w3.org/2000/svg', nodeName) : document.createElement(nodeName));
	ensureNodeData(node);
	node.normalizedNodeName = name;
	return node;
}


