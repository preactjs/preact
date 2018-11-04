import { EMPTY_OBJ, EMPTY_ARR } from './constants';
import { diff, commitRoot } from './diff/index';
import { diffChildren } from './diff/children';
import { coerceToVNode } from './create-element';

/**
 * Render a Preact virtual node into a DOM element
 * @param {import('./index').ComponentChild} vnode The virtual node to render
 * @param {import('./internal').PreactElement} parentDom The DOM element to
 * render into
 */
export function render(vnode, parentDom) {
	let oldTree = parentDom._previousVTree;
	if (oldTree) {
		let mounts = [];
		diff(oldTree._el, parentDom, parentDom._previousVTree = coerceToVNode(vnode), oldTree, EMPTY_OBJ, parentDom.ownerSVGElement!==undefined, true, null, mounts, null, {});
		commitRoot(mounts, parentDom._previousVTree);
	}
	else hydrate(vnode, parentDom);
}

/**
 * Update an existing DOM element with data from a Preact virtual node
 * @param {import('./index').ComponentChild} vnode The virtual node to render
 * @param {import('./internal').PreactElement} parentDom The DOM element to
 * update
 */
export function hydrate(vnode, parentDom) {
	parentDom._previousVTree = vnode = coerceToVNode(vnode);
	let mounts = [];
	diffChildren(parentDom, [vnode], EMPTY_ARR, EMPTY_OBJ, parentDom.ownerSVGElement!==undefined, EMPTY_ARR.slice.call(parentDom.childNodes), mounts, null, {});
	commitRoot(mounts, vnode);
}
