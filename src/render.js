import { MODE_HYDRATE, MODE_MUTATIVE_HYDRATE, MODE_NONE } from './constants';
import { commitRoot } from './diff/commit';
import { createElement, Fragment } from './create-element';
import options from './options';
import { mount } from './diff/mount';
import { patch } from './diff/patch';

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

	// Cases:
	// render(vnode, parent): excessDomChildren=.childNodes --> startDom = parent.firstChild
	// hydrate(vnode, parent): excessDomChildren=.childNodes --> startDom = parent.firstChild
	// render(vnode, parent, child): excessDomChildren=[child] --> startDom = child
	// render(vnode, parent) on existing tree: excessDomChildren=null --> startDom = (oldVNode=parent.__k)._dom

	// Set newVNode._mode
	if (isHydrating) {
		newVNode._mode = MODE_HYDRATE;
	} else if (replaceNode || parentDom.firstChild) {
		// Providing a replaceNode parameter or calling `render` on a container with
		// existing DOM elements puts the diff into mutative hydrate mode
		newVNode._mode = MODE_MUTATIVE_HYDRATE;
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
			oldVNode._dom
		);
	} else {
		mount(
			parentDom,
			newVNode,
			{},
			parentDom.ownerSVGElement !== undefined,
			commitQueue,
			!isHydrating && replaceNode ? replaceNode : parentDom.firstChild
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
