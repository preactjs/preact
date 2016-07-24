import { toLowerCase } from '../util';
import { ensureNodeData, getNodeType, getRawNodeAttributes, removeNode } from './index';

/** DOM node pool, keyed on nodeName. */

const nodes = {};

export function collectNode(node) {
	cleanNode(node);
	let name = toLowerCase(node.nodeName),
		list = nodes[name];
	if (list) list.push(node);
	else nodes[name] = [node];
}


export function createNode(nodeName, isSvg) {
	let name = toLowerCase(nodeName),
		node = nodes[name] && nodes[name].pop() || (isSvg ? document.createElementNS('http://www.w3.org/2000/svg', nodeName) : document.createElement(nodeName));
	ensureNodeData(node);
	node.normalizedNodeName = name;
	return node;
}


function cleanNode(node) {
	removeNode(node);

	if (getNodeType(node)!==1) return;

	// When reclaiming externally created nodes, seed the attribute cache: (Issue #97)

	ensureNodeData(node, getRawNodeAttributes(node));

	node._component = node._componentConstructor = null;

	// if (node.childNodes.length>0) {
	// 	console.trace(`Warning: Recycler collecting <${node.nodeName}> with ${node.childNodes.length} children.`);
	// 	for (let i=node.childNodes.length; i--; ) collectNode(node.childNodes[i]);
	// }
}
