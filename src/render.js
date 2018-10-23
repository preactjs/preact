import { EMPTY_OBJ, EMPTY_ARR } from './constants';
import { diff, commitRoot } from './diff/index';
import { diffChildren } from './diff/children';
import { coerceToVNode } from './create-element';

/**
 * Render a Preact virtual node into a DOM element
 * @param {import('./index').ComponentChild} vnode The virtual node to render
 * @param {import('./internal').PreactElement} parent The DOM element to
 * render into
 */
export function render(vnode, parent) {
	let oldTree = parent._previousVTree;
	if (oldTree) {
		let mounts = [];
		diff(oldTree._el, parent, parent._previousVTree = coerceToVNode(vnode), oldTree, EMPTY_OBJ, parent.ownerSVGElement!==undefined, true, null, mounts, null, {});
		commitRoot(mounts, parent._previousVTree);
	}
	else hydrate(vnode, parent);
}

/**
 * Update an existing DOM element with data from a Preact virtual node
 * @param {import('./index').ComponentChild} vnode The virtual node to render
 * @param {import('./internal').PreactElement} parent The DOM element to
 * update
 */
export function hydrate(vnode, parent) {
	parent._previousVTree = vnode = coerceToVNode(vnode);
	let mounts = [];
	diffChildren(parent, [vnode], EMPTY_ARR, EMPTY_OBJ, parent.ownerSVGElement!==undefined, EMPTY_ARR.slice.call(parent.childNodes), mounts, null, {});
	commitRoot(mounts, vnode);
}
