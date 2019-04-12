import { EMPTY_OBJ, EMPTY_ARR } from './constants';
import { commitRoot } from './diff/index';
import { diffChildren } from './diff/children';
import { createElement, Fragment } from './create-element';
import options from './options';

/**
 * Render a Preact virtual node into a DOM element
 * @param {import('./index').ComponentChild} vnode The virtual node to render
 * @param {import('./internal').PreactElement} parentDom The DOM element to
 * render into
 */
export function render(vnode, parentDom) {
	if (options.root) options.root(vnode, parentDom);
	let oldVNode = parentDom._prevVNode;
	vnode = createElement(Fragment, null, [vnode]);

	let mounts = [];
	diffChildren(parentDom, parentDom._prevVNode = vnode, oldVNode, EMPTY_OBJ, parentDom.ownerSVGElement!==undefined, oldVNode ? null : EMPTY_ARR.slice.call(parentDom.childNodes), mounts, vnode, EMPTY_OBJ);
	commitRoot(mounts, vnode);
}

/**
 * Update an existing DOM element with data from a Preact virtual node
 * @param {import('./index').ComponentChild} vnode The virtual node to render
 * @param {import('./internal').PreactElement} parentDom The DOM element to
 * update
 */
export function hydrate(vnode, parentDom) {
	parentDom._prevVNode = null;
	render(vnode, parentDom);
}
