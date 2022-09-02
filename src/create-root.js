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
import { rendererState } from './component';

/**
 *
 * @param {import('./internal').PreactElement} parentDom The DOM element to
 * @returns {import('./internal').Root}
 */
export function createRoot(parentDom) {
	let rootInternal,
		firstChild,
		flags = 0;

	function render(vnode) {
		if (options._root) options._root(vnode, parentDom);

		vnode = createElement(Fragment, { _parentDom: parentDom }, [vnode]);

		firstChild =
			/** @type {import('./internal').PreactElement} */ (parentDom.firstChild);

		rendererState._context = {};
		// List of effects that need to be called after diffing:
		rendererState._commitQueue = [];

		if (rootInternal) {
			patch(rootInternal, vnode, parentDom);
		} else {
			rootInternal = createInternal(vnode);

			// Store the VDOM tree root on the DOM element in a (minified) property:
			parentDom._children = rootInternal;

			// Calling createRoot().render() on an Element with existing children triggers mutative hydrate mode:
			if (firstChild) {
				flags = flags || MODE_MUTATIVE_HYDRATE;
			}
			// If the parent of this tree is within an inline SVG, the tree should start off in SVG mode:
			if (parentDom.ownerSVGElement !== UNDEFINED) {
				flags |= MODE_SVG;
			}
			rootInternal.flags |= flags;

			rootInternal._context = {};

			mount(rootInternal, vnode, parentDom, firstChild);
		}

		// Flush all queued effects
		commitRoot(rootInternal);
	}

	return {
		hydrate(vnode) {
			flags |= MODE_HYDRATE;
			render(vnode);
		},
		render
	};
}
