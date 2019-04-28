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
 * @param {Element | Text} [replaceNode] Attempt to re-use an
 * existing DOM tree rooted at `replaceNode`
 */
export function render(vnode, parentDom, replaceNode) {
	if (options.root) options.root(vnode, parentDom);
	let oldVNode = parentDom._prevVNode;
	vnode = createElement(Fragment, null, [vnode]);

	let mounts = [];
	diffChildren(
		parentDom,
		replaceNode ? vnode : (parentDom._prevVNode = vnode),
		replaceNode ? undefined : oldVNode,
		EMPTY_OBJ,
		parentDom.ownerSVGElement !== undefined,
		replaceNode
			? [replaceNode]
			: oldVNode
				? null
				: EMPTY_ARR.slice.call(parentDom.childNodes),
		mounts,
		vnode,
		replaceNode || EMPTY_OBJ
	);
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
