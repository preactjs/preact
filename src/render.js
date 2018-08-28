import { EMPTY_OBJ, EMPTY_ARR } from './constants';
import { diff } from './diff/index';
import { diffChildren } from './diff/children';
import { coerceToVNode } from './create-element';

export function render(vnode, parent) {
	let oldTree = parent._previousVTree;
	if (oldTree) diff(oldTree._el, parent, parent._previousVTree = coerceToVNode(vnode), oldTree, EMPTY_OBJ, false, true, null, true, [], null);
	else hydrate(vnode, parent);
}

export function hydrate(vnode, parent) {
	parent._previousVTree = vnode = coerceToVNode(vnode);
	diffChildren(parent, [vnode], EMPTY_ARR, EMPTY_OBJ, false, EMPTY_ARR.slice.call(parent.childNodes), true, [], null);
}
