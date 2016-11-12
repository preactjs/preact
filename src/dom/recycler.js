import { ATTR_KEY } from '../constants';
import { toLowerCase } from '../util';
import { removeNode } from './index';

/** DOM node pool, keyed on nodeName. */

const nodes = {};

export function collectNode(node) {
	removeNode(node);

	if (node instanceof Element) {
		if (node.nodeName === 'IMG') {
			node.removeAttribute ('src');
			delete node[ATTR_KEY].src;
		}
		if (node.nodeName === 'IMAGE') {
			node.removeAttributeNS ('http://www.w3.org/1999/xlink', 'href');
			delete node[ATTR_KEY].xlinkhref;
		}

		node._component = node._componentConstructor = null;

		let name = node.normalizedNodeName || toLowerCase(node.nodeName);
		(nodes[name] || (nodes[name] = [])).push(node);
	}
}


export function createNode(nodeName, isSvg) {
	let name = toLowerCase(nodeName),
		node = nodes[name] && nodes[name].pop() || (isSvg ? document.createElementNS('http://www.w3.org/2000/svg', nodeName) : document.createElement(nodeName));
	node.normalizedNodeName = name;
	return node;
}
