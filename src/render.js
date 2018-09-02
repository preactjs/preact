import { EMPTY_OBJ, EMPTY_ARR } from './constants';
import { diff, flushMounts } from './diff/index';
import { diffChildren } from './diff/children';
import { coerceToVNode } from './create-element';

export function render(vnode, parent) {
	let oldTree = parent._previousVTree;
	if (oldTree) {
		let mounts = [];
		diff(oldTree._el, parent, parent._previousVTree = coerceToVNode(vnode), oldTree, EMPTY_OBJ, parent.ownerSVGElement!==undefined, true, null, mounts, null);
		flushMounts(mounts);
	}
	else hydrate(vnode, parent);
}

export function hydrate(vnode, parent) {
	parent._previousVTree = vnode = coerceToVNode(vnode);
	let mounts = [];
	diffChildren(parent, [vnode], EMPTY_ARR, EMPTY_OBJ, parent.ownerSVGElement!==undefined, EMPTY_ARR.slice.call(parent.childNodes), mounts, null);
	flushMounts(mounts);
}
