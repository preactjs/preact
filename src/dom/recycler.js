import { ATTR_KEY } from '../constants';
import { hasOwnProperty, memoize } from '../util';
import { setAccessor, ensureNodeData } from '.';

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
	if (node.parentNode) node.parentNode.removeChild(node);

	if (node.nodeType===3) return;

	let attrs = node[ATTR_KEY];
	for (let i in attrs) {
		if (hasOwnProperty.call(attrs, i)) {
			setAccessor(node, i, null, attrs[i]);
		}
	}

	node[ATTR_KEY] = node._component = node._componentConstructor = null;

	// if (node.childNodes.length>0) {
	// 	console.warn(`Warning: Recycler collecting <${node.nodeName}> with ${node.childNodes.length} children.`);
	// 	toArray(node.childNodes).forEach(recycler.collect);
	// }
}
