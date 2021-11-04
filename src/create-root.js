import {
	MODE_HYDRATE,
	MODE_MUTATIVE_HYDRATE,
	MODE_SVG,
	UNDEFINED
} from './constants';
import { commitRoot } from './diff/commit';
import { createElement, Fragment } from './create-element';
import options from './options';
import { mount } from './diff/mount';
import { patch } from './diff/patch';
import { createInternal } from './tree';

/**
 *
 * @param {import('./internal').PreactElement} parentDom The DOM element to
 */
export function createRoot(parentDom) {
	let rootInternal = null;

	function render(vnode) {
		if (options._root) options._root(vnode, parentDom);

		// List of effects that need to be called after diffing.
		const commitQueue = [];

		vnode = createElement(Fragment, { _parentDom: parentDom }, [vnode]);

		if (rootInternal) {
			patch(
				parentDom,
				vnode,
				rootInternal,
				{},
				commitQueue,
				parentDom.firstChild
			);
		} else {
			// Store the VDOM tree root on the DOM element in a (minified) property:
			rootInternal = parentDom._children = createInternal(vnode, null);

			if (parentDom.ownerSVGElement !== UNDEFINED) {
				rootInternal.flags |= MODE_SVG;
			}

			// Calling `render` on a container with existing DOM elements puts the diff into mutative hydrate mode:
			if (parentDom.firstChild) {
				rootInternal.flags |= MODE_MUTATIVE_HYDRATE;
			}

			mount(
				parentDom,
				vnode,
				rootInternal,
				{},
				commitQueue,
				// Start the diff at the replaceNode or the parentDOM.firstChild if any.
				// Will be null if the parentDom is empty
				parentDom.firstChild
			);
		}

		// Flush all queued effects
		commitRoot(commitQueue, vnode);
	}

	return {
		hydrate(vnode) {
			if (options._root) options._root(vnode, parentDom);

			vnode = createElement(Fragment, { _parentDom: parentDom }, [vnode]);
			rootInternal = createInternal(vnode);
			rootInternal.flags |= MODE_HYDRATE;
			parentDom._children = rootInternal;

			if (parentDom.ownerSVGElement !== UNDEFINED) {
				rootInternal.flags |= MODE_SVG;
			}

			const commitQueue = [];
			mount(
				parentDom,
				vnode,
				rootInternal,
				{},
				commitQueue,
				parentDom.firstChild
			);
			commitRoot(commitQueue, rootInternal);
		},
		render
	};
}
