import { rendererState } from './component';
import {
	MODE_HYDRATE,
	MODE_MUTATIVE_HYDRATE,
	MODE_SVG,
	UNDEFINED
} from './constants';
import { createElement, Fragment } from './create-element';
import { commitRoot } from './diff/commit';
import { mount } from './diff/mount';
import { patch } from './diff/patch';
import options from './options';
import { createInternal } from './tree';

/**
 * Render a Preact virtual node into a DOM element
 * @param {import('./internal').ComponentChild} vnode The virtual node to render
 * @param {import('./internal').PreactElement} parentDom The DOM element to
 * render into
 */
export function render(vnode, parentDom, hydrate) {
	if (options._root) options._root(vnode, parentDom);

	vnode = createElement(Fragment, { _parentDom: parentDom }, [vnode]);

	let flags = 0,
		firstChild =
			/** @type {import('./internal').PreactElement} */ (parentDom.firstChild),
		rootInternal = parentDom._children;

	rendererState._context = {};
	// List of effects that need to be called after diffing:
	rendererState._commitQueue = [];
	rendererState._parentDom = parentDom;

	if (hydrate) {
		flags |= MODE_HYDRATE;
	}

	if (rootInternal) {
		patch(rootInternal, vnode);
	} else {
		rootInternal = createInternal(vnode);
		// Store the VDOM tree root on the DOM element in a (minified) property:
		parentDom._children = rootInternal;
		// Calling render on an Element with existing children triggers mutative hydrate mode:
		if (firstChild && !hydrate) {
			flags = flags || MODE_MUTATIVE_HYDRATE;
		}

		if (parentDom.ownerSVGElement !== UNDEFINED) {
			flags |= MODE_SVG;
		}
		rootInternal.flags |= flags;

		rootInternal._context = {};

		mount(rootInternal, vnode, firstChild);
	}

	commitRoot(rootInternal);
}

// Flush all queued effects
/**
 * Update an existing DOM element with data from a Preact virtual node
 * @param {import('./internal').ComponentChild} vnode The virtual node to render
 * @param {import('./internal').PreactElement} parentDom The DOM element to
 * update
 */
export function hydrate(vnode, parentDom) {
	render(vnode, parentDom, true);
}
