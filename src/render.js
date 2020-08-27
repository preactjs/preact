import { EMPTY_OBJ, EMPTY_ARR } from './constants';
import { commitRoot, diff } from './diff/index';
import { createElement, Fragment } from './create-element';
import options from './options';

/**
 *
 * @param {import('./internal').PreactElement} parentDom The DOM element to
 */
export function createRoot(parentDom) {
	let oldRoot = null;
	return {
		hydrate(vnode) {
			if (options._root) options._root(vnode, parentDom);

			vnode = createElement(Fragment, null, [vnode]);

			// List of effects that need to be called after diffing.
			let commitQueue = [];

			diff(
				parentDom,
				(oldRoot = vnode),
				oldRoot || EMPTY_OBJ,
				EMPTY_OBJ,
				parentDom.ownerSVGElement !== undefined,
				oldRoot
					? null
					: parentDom.childNodes.length
					? EMPTY_ARR.slice.call(parentDom.childNodes)
					: null,
				commitQueue,
				EMPTY_OBJ,
				false
			);

			// Flush all queued effects
			commitRoot(commitQueue, vnode);
		},
		render(vnode) {
			if (options._root) options._root(vnode, parentDom);

			vnode = createElement(Fragment, null, [vnode]);

			// List of effects that need to be called after diffing.
			let commitQueue = [];

			diff(
				parentDom,
				(oldRoot = vnode),
				EMPTY_OBJ,
				EMPTY_OBJ,
				parentDom.ownerSVGElement !== undefined,
				parentDom.childNodes.length
					? EMPTY_ARR.slice.call(parentDom.childNodes)
					: null,
				commitQueue,
				EMPTY_OBJ,
				true
			);

			// Flush all queued effects
			commitRoot(commitQueue, vnode);
		}
	};
}
