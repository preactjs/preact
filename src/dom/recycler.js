import { ATTR_KEY } from '../constants';
import { memoize } from '../util';
import { ensureNodeData, getNodeType, getRawNodeAttributes, removeNode } from '.';

/** DOM node pool, keyed on nodeName. */

let nodes = {};

let normalizeName = memoize(name => name.toUpperCase());


export function collectNode(node) {
	cleanNode(node);
	let name = normalizeName(node.nodeName),
		list = nodes[name];
	if (list) list.push(node);
	else nodes[name] = [node];
}


export function createNode(nodeName) {
	let name = normalizeName(nodeName),
		list = nodes[name],
		node = list && list.pop() || document.createElement(nodeName);
	ensureNodeData(node);
	return node;
}


function cleanNode(node) {
	removeNode(node);

	if (getNodeType(node)===3) return;

	// When reclaiming externally created nodes, seed the attribute cache: (Issue #97)
	if (!node[ATTR_KEY]) {
		node[ATTR_KEY] = getRawNodeAttributes(node);
	}

	node._component = node._componentConstructor = null;

	// if (node.childNodes.length>0) {
	// 	console.trace(`Warning: Recycler collecting <${node.nodeName}> with ${node.childNodes.length} children.`);
	// 	for (let i=node.childNodes.length; i--; ) collectNode(node.childNodes[i]);
	// }
}
