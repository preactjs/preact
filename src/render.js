import { EMPTY_OBJ, EMPTY_ARR, TEXT_NODE } from './constants';
import { diff /*, getVNodeChildren*/ } from './diff/index';
import { diffChildren } from './diff/children';
import { createVNode, coerceToVNode } from './create-element';

export function render(vnode, parent) {
	let oldTree = parent._previousVTree;
	if (oldTree) diff(oldTree._el, parent, parent._previousVTree = coerceToVNode(vnode), oldTree, EMPTY_OBJ, false, true, null, 0, [] );
	else hydrate(vnode, parent);
}

export function hydrate(vnode, parent) {
	// let oldTree = toVNode(parent);
	// diffChildren(parent, null, [vnode], oldTree.children);
	parent._previousVTree = vnode = coerceToVNode(vnode);
	diffChildren(parent, [vnode], EMPTY_ARR, EMPTY_OBJ, false, EMPTY_ARR.slice.call(parent.childNodes), 0, []);
}

export function toVNode(node) {
	// Text nodes correspond to VNodes with type=3 (TEXT_NODE)
	if (node.nodeType===TEXT_NODE) {
		return createVNode(TEXT_NODE, null, null, null, node.data, null);
	}

	let props = {};

	// Benchmark:  https://esbench.com/bench/5b2072d7f2949800a0f61d63
	// let attrs = node.getAttributeNames();
	// for (let i=0; i<attrs.length; i++) {
	// 	props[attrs[i]] = node.getAttribute(attrs[i]);
	// }
	for (let i=0; i<node.attributes.length; i++) {
		let attr = node.attributes[i];
		props[attr.name] = attr.value;
	}

	return createVNode(node.nodeType, node.localName, props, EMPTY_ARR.map.call(node.childNodes, toVNode), null, null);

	// if (node.nodeType===ELEMENT_NODE) {
	// 	let props = {};
	// 	for (let i=0; i<node.attributes.length; i++) {
	// 		let attr = node.attributes[i];
	// 		props[attr.name] = attr.value;
	// 	}
	// 	return createVNode(ELEMENT_NODE, node.localName, props, EMPTY_ARR.map.call(node.childNodes, toVNode), null, null);
	// }
	// return createVNode(TEXT_NODE, null, null, null, node.data, null);

	// let type = node.nodeType,
	// 	props = null;
	// if (type===1) {
	// 	for (let i=0; i<node.attributes.length; i++) {
	// 		if (i===0) props = {};
	// 		let attr = node.attributes[i];
	// 		props[attr.name] = attr.value;
	// 	}
	// }
	// return createVNode(type, type===1 ? node.localName : null, props, node.childNodes==null ? null : EMPTY_ARR.map.call(node.childNodes, toVNode), type===TEXT_NODE ? node.data : null, null);
}
