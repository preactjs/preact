import { EMPTY_OBJ, EMPTY_ARR } from './constants';
import { diff, commitRoot } from './diff/index';
import { diffChildren } from './diff/children';
import { coerceToVNode, createElement, Fragment } from './create-element';

/**
 * Render a Preact virtual node into a DOM element
 * @param {import('./index').ComponentChild} vnode The virtual node to render
 * @param {import('./internal').PreactElement} parentDom The DOM element to
 * render into
 */
export function render(vnode, parentDom) {
	let oldVNode = parentDom._prevVNode;
	if (oldVNode) {
		let mounts = [];
		diff(oldVNode._dom, parentDom, parentDom._prevVNode = coerceToVNode(vnode), oldVNode, EMPTY_OBJ, parentDom.ownerSVGElement!==undefined, true, null, mounts, null);
		commitRoot(mounts, parentDom._prevVNode);
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
	parentDom._prevVNode = vnode = coerceToVNode(vnode);
	let mounts = [];
	diffChildren(parentDom, createElement(Fragment, null, [vnode]), null, EMPTY_OBJ, parentDom.ownerSVGElement!==undefined, EMPTY_ARR.slice.call(parentDom.childNodes), mounts, null);
	commitRoot(mounts, vnode);
}
