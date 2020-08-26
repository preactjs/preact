import { EMPTY_OBJ, EMPTY_ARR } from './constants';
import { commitRoot, diff } from './diff/index';
import { createElement, Root } from './create-element';
import options from './options';

/**
 *
 * @param {import('./internal').PreactElement} parentDom The DOM element to
 */
export function createRoot(parentDom) {
	let oldRoot = null;
	function render(vnode, isHydrating) {
		if (options._root) options._root(vnode, parentDom);

		let oldVNode = isHydrating ? null : oldRoot;
		vnode = createElement(Root, { _parentDom: parentDom }, [vnode]);

		// List of effects that need to be called after diffing.
		let commitQueue = [];

		diff(
			parentDom,
			(oldRoot = vnode),
			oldVNode || EMPTY_OBJ,
			EMPTY_OBJ,
			parentDom.ownerSVGElement !== undefined,
			oldVNode
				? null
				: parentDom.childNodes.length
				? EMPTY_ARR.slice.call(parentDom.childNodes)
				: null,
			commitQueue,
			EMPTY_OBJ,
			isHydrating
		);

		// Flush all queued effects
		commitRoot(commitQueue, vnode);
	}
	return {
		hydrate(vnode) {
			render(vnode, true);
		},
		render
	};
}
