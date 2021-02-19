import { MODE_HYDRATE, MODE_MUTATIVE_HYDRATE } from './constants';
import { commitRoot } from './diff/commit';
import { createElement, Fragment } from './create-element';
import options from './options';
import { mount } from './diff/mount';
import { patch } from './diff/patch';
import { createInternal } from './tree';

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

	// List of effects that need to be called after diffing.
	const commitQueue = [];

	// To be able to support calling `render()` multiple times on the same
	// DOM node, we need to obtain a reference to the previous tree. We do
	// this by assigning a new `_children` property to DOM nodes which points
	// to the last rendered tree. By default this property is not present, which
	// means that we are mounting a new tree for the first time.
	let rootInternal =
		(replaceNode && replaceNode._children) || parentDom._children;
	vnode = createElement(Fragment, null, [vnode]);
	if (rootInternal) {
		patch(
			parentDom,
			vnode,
			rootInternal,
			{},
			parentDom.ownerSVGElement !== undefined,
			commitQueue,
			rootInternal._dom
		);
	} else {
		// Store the VDOM tree root on the DOM element in a (minified) property:
		rootInternal = (replaceNode || parentDom)._children = createInternal(
			vnode,
			null
		);

		// Providing a replaceNode parameter or calling `render` on a container with
		// existing DOM elements puts the diff into mutative hydrate mode:
		if (replaceNode || parentDom.firstChild) {
			rootInternal._mode = MODE_MUTATIVE_HYDRATE;
		}

		mount(
			parentDom,
			vnode,
			rootInternal,
			{},
			parentDom.ownerSVGElement !== undefined,
			commitQueue,
			// Start the diff at the replaceNode or the parentDOM.firstChild if any.
			// Will be null if the parentDom is empty
			replaceNode || parentDom.firstChild
		);
	}

	// Flush all queued effects
	commitRoot(commitQueue, rootInternal);
}

/**
 * Update an existing DOM element with data from a Preact virtual node
 * @param {import('./internal').ComponentChild} vnode The virtual node to render
 * @param {import('./internal').PreactElement} parentDom The DOM element to
 * update
 */
export function hydrate(vnode, parentDom) {
	if (options._root) options._root(vnode, parentDom);

	/** @type {import('./internal').PreactElement} */
	const hydrateDom = (parentDom.firstChild);

	vnode = createElement(Fragment, null, [vnode]);
	const rootInternal = createInternal(vnode);
	rootInternal._mode = MODE_HYDRATE;
	parentDom._children = rootInternal;

	const commitQueue = [];
	mount(
		parentDom,
		vnode,
		rootInternal,
		{},
		parentDom.ownerSVGElement !== undefined,
		commitQueue,
		hydrateDom
	);
	commitRoot(commitQueue, rootInternal);
}
