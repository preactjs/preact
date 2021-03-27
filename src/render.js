import { MODE_HYDRATE, MODE_MUTATIVE_HYDRATE, MODE_SVG } from './constants';
import { commitRoot } from './diff/commit';
import { createElement, Fragment } from './create-element';
import options from './options';
import { mount } from './diff/mount';
import { patch } from './diff/patch';
import { createInternal, getChildDom } from './tree';

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
	vnode = createElement(Fragment, { _parentDom: parentDom }, [vnode]);

	if (rootInternal) {
		patch(
			parentDom,
			vnode,
			rootInternal,
			{},
			commitQueue,
			getChildDom(rootInternal, 0) // TODO: could this just be parentDom.firstChild? Probably once we drop replaceNode
		);
	} else {
		// Store the VDOM tree root on the DOM element in a (minified) property:
		rootInternal = (replaceNode || parentDom)._children = createInternal(
			vnode,
			null
		);

		if (parentDom.ownerSVGElement !== undefined) {
			rootInternal._flags |= MODE_SVG;
		}

		// Providing a replaceNode parameter or calling `render` on a container with
		// existing DOM elements puts the diff into mutative hydrate mode:
		if (replaceNode || parentDom.firstChild) {
			rootInternal._flags |= MODE_MUTATIVE_HYDRATE;
		}

		mount(
			parentDom,
			vnode,
			rootInternal,
			{},
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

	vnode = createElement(Fragment, { _parentDom: parentDom }, [vnode]);
	const rootInternal = createInternal(vnode);
	rootInternal._flags |= MODE_HYDRATE;
	parentDom._children = rootInternal;

	if (parentDom.ownerSVGElement !== undefined) {
		rootInternal._flags |= MODE_SVG;
	}

	const commitQueue = [];
	mount(parentDom, vnode, rootInternal, {}, commitQueue, parentDom.firstChild);
	commitRoot(commitQueue, rootInternal);
}
