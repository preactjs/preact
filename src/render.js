import { EMPTY_ARR } from './constants';
import { commitRoot } from './diff/commit';
import { createElement, Fragment } from './create-element';
import options from './options';
import { mount } from './diff/mount';
import { patch } from './diff/patch';
import { getDomSibling } from './component';

/**
 * Render a Preact virtual node into a DOM element
 * @param {import('./internal').ComponentChild} vnode The virtual node to render
 * @param {import('./internal').PreactElement} parentDom The DOM element to
 * render into
 * @param {import('./internal').PreactElement | object} [replaceNode] Optional: Attempt to re-use an
 * existing DOM tree rooted at `replaceNode`
 */
export function render(vnode, parentDom, replaceNode) {
	if (options._root) options._root(vnode, parentDom);

	// We abuse the `replaceNode` parameter in `hydrate()` to signal if we are in
	// hydration mode or not by passing the `hydrate` function instead of a DOM
	// element. `typeof a === 'function'` compresses well.
	let isHydrating = typeof replaceNode === 'function';

	// To be able to support calling `render()` multiple times on the same
	// DOM node, we need to obtain a reference to the previous tree. We do
	// this by assigning a new `_children` property to DOM nodes which points
	// to the last rendered tree. By default this property is not present, which
	// means that we are mounting a new tree for the first time.
	let oldVNode = isHydrating
		? null
		: (replaceNode && replaceNode._children) || parentDom._children;
	vnode = createElement(Fragment, null, [vnode]);

	// Determine the new vnode tree and store it on the DOM element on
	// our custom `_children` property.
	let newVNode = ((isHydrating
		? parentDom
		: replaceNode || parentDom
	)._children = vnode);

	/** @type {import('./internal').PreactElement[]} */
	let excessDomChildren =
		replaceNode && !isHydrating
			? [replaceNode]
			: oldVNode
			? null
			: parentDom.childNodes.length
			? EMPTY_ARR.slice.call(parentDom.childNodes)
			: null;

	if (isHydrating) {
		replaceNode = excessDomChildren ? excessDomChildren[0] : null;
	}

	// List of effects that need to be called after diffing.
	let commitQueue = [];
	if (oldVNode) {
		patch(
			parentDom,
			newVNode,
			oldVNode,
			{},
			parentDom.ownerSVGElement !== undefined,
			commitQueue,
			// Begin diff with replaceNode or find the first non-null child with a dom
			// pointer and begin the diff with that (i.e. what getDomSibling does)
			replaceNode || getDomSibling(oldVNode, 0)
		);
	} else {
		mount(
			parentDom,
			newVNode,
			{},
			parentDom.ownerSVGElement !== undefined,
			excessDomChildren,
			commitQueue,
			replaceNode || null,
			isHydrating
		);
	}

	// Flush all queued effects
	commitRoot(commitQueue, vnode);
}

/**
 * Update an existing DOM element with data from a Preact virtual node
 * @param {import('./internal').ComponentChild} vnode The virtual node to render
 * @param {import('./internal').PreactElement} parentDom The DOM element to
 * update
 */
export function hydrate(vnode, parentDom) {
	render(vnode, parentDom, hydrate);
}
