import { map, EMPTY_OBJ } from './constants';
import { diff /*, getVNodeChildren*/ } from './diff/index';
import { diffChildren } from './diff/children';
import { createVNode } from './create-element';

export function render(vnode, parent) {
	let oldTree = parent.__vroot;
	if (oldTree) diff(oldTree._el, parent, parent.__vroot = vnode, oldTree);
	else hydrate(vnode, parent);
}

export function hydrate(vnode, parent) {
	// let oldTree = toVNode(parent);
	// diffChildren(parent, null, [vnode], oldTree.children);
	parent.__vroot = vnode;
	diffChildren(parent, [vnode], [], [].slice.call(parent.childNodes), EMPTY_OBJ, false);
}

export function toVNode(node) {
	let type = node.nodeType,
		props = null;
	if (type===1) {
		for (let i=0; i<node.attributes.length; i++) {
			if (i===0) props = {};
			let attr = node.attributes[i];
			props[attr.name] = attr.value;
		}
	}
	return createVNode(type, type===1 ? node.localName : null, props, map.call(node.childNodes, toVNode), type===3 ? node.nodeValue : null, null);
}