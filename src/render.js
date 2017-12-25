import { EMPTY_OBJ, EMPTY_ARR } from './constants';
import { diff /*, getVNodeChildren*/ } from './diff/index';
import { diffChildren } from './diff/children';
import { createVNode } from './create-element';

export function render(vnode, parent) {
	let oldTree = parent._previousVTree;
	if (oldTree) diff(oldTree._el, parent, parent._previousVTree = vnode, oldTree, EMPTY_OBJ, false, true, null);
	else hydrate(vnode, parent);
}

export function hydrate(vnode, parent) {
	// let oldTree = toVNode(parent);
	// diffChildren(parent, null, [vnode], oldTree.children);
	parent._previousVTree = vnode;
	diffChildren(parent, [vnode], EMPTY_ARR, EMPTY_OBJ, false, EMPTY_ARR.slice.call(parent.childNodes));
}

export function toVNode(node) {
	if (node.nodeType===3) {
		return createVNode(3, null, null, null, node.nodeValue, null);
	}
	let props = {};
	for (let i=0; i<node.attributes.length; i++) {
		let attr = node.attributes[i];
		props[attr.name] = attr.value;
	}
	return createVNode(node.nodeType, node.localName, props, EMPTY_ARR.map.call(node.childNodes, toVNode), null, null);

	// if (node.nodeType===1) {
	// 	let props = {};
	// 	for (let i=0; i<node.attributes.length; i++) {
	// 		let attr = node.attributes[i];
	// 		props[attr.name] = attr.value;
	// 	}
	// 	return createVNode(1, node.localName, props, EMPTY_ARR.map.call(node.childNodes, toVNode), null, null);
	// }
	// return createVNode(3, null, null, null, node.nodeValue, null);

	// let type = node.nodeType,
	// 	props = null;
	// if (type===1) {
	// 	for (let i=0; i<node.attributes.length; i++) {
	// 		if (i===0) props = {};
	// 		let attr = node.attributes[i];
	// 		props[attr.name] = attr.value;
	// 	}
	// }
	// return createVNode(type, type===1 ? node.localName : null, props, node.childNodes==null ? null : EMPTY_ARR.map.call(node.childNodes, toVNode), type===3 ? node.nodeValue : null, null);
}