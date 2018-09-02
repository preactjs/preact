import { EMPTY_OBJ, EMPTY_ARR } from './constants';
import { diff, flushMounts, nodeIsSvg } from './diff/index';
import { diffChildren } from './diff/children';
import { coerceToVNode } from './create-element';

/**
 * Render a Preact virtual node into a DOM element
 * @param {import('./index').ComponentChild} vnode The virutal node to render
 * @param {import('./internal').PreactElement} parent The DOM element to
 * render into
 */
export function render(vnode, parent) {
	let oldTree = parent._previousVTree;
	if (oldTree) {
		let mounts = [];
		diff(oldTree._el, parent, parent._previousVTree = coerceToVNode(vnode), oldTree, EMPTY_OBJ, nodeIsSvg(parent), true, null, mounts, null);
		flushMounts(mounts);
	}
	else hydrate(vnode, parent);
}

/**
 * Update an existing DOM element with data from a Preact virtual node
 * @param {import('./index').ComponentChild} vnode The virutal node to render
 * @param {import('./internal').PreactElement} parent The DOM element to
 * update
 */
export function hydrate(vnode, parent) {
	parent._previousVTree = vnode = coerceToVNode(vnode);
	let mounts = [];
	diffChildren(parent, [vnode], EMPTY_ARR, EMPTY_OBJ, nodeIsSvg(parent), EMPTY_ARR.slice.call(parent.childNodes), mounts, null);
	flushMounts(mounts);
}
