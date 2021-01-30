import { MODE_HYDRATE, MODE_MUTATIVE_HYDRATE } from './constants';
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

	// To be able to support calling `render()` multiple times on the same
	// DOM node, we need to obtain a reference to the previous tree. We do
	// this by assigning a new `_children` property to DOM nodes which points
	// to the last rendered tree. By default this property is not present, which
	// means that we are mounting a new tree for the first time.
	let oldVNode = (replaceNode && replaceNode._children) || parentDom._children;

	// Determine the new vnode tree and store it on the DOM element on
	// our custom `_children` property.
	vnode = (replaceNode || parentDom)._children = createElement(Fragment, null, [
		vnode
	]);

	// Set vnode._mode
	if (replaceNode || parentDom.firstChild) {
		// Providing a replaceNode parameter or calling `render` on a container with
		// existing DOM elements puts the diff into mutative hydrate mode
		vnode._mode = MODE_MUTATIVE_HYDRATE;
	}

	// List of effects that need to be called after diffing.
	let commitQueue = [];
	if (oldVNode) {
		patch(
			parentDom,
			vnode,
			oldVNode,
			{},
			parentDom.ownerSVGElement !== undefined,
			commitQueue,
			oldVNode._dom
		);
	} else {
		mount(
			parentDom,
			vnode,
			{},
			parentDom.ownerSVGElement !== undefined,
			commitQueue,
			// Start the diff at the replaceNode or the parentDOM.firstChild if any.
			// Will be null if the parentDom is empty
			replaceNode || parentDom.firstChild
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
	if (options._root) options._root(vnode, parentDom);

	vnode = createElement(Fragment, null, [vnode]);
	vnode._mode = MODE_HYDRATE;

	let commitQueue = [];
	mount(
		parentDom,
		vnode,
		{},
		parentDom.ownerSVGElement !== undefined,
		commitQueue,
		// @ts-ignore Trust me TS, this is a PreactElement
		parentDom.firstChild
	);
	commitRoot(commitQueue, vnode);
}
