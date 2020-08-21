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
	function render(vnode, replaceNode) {
		if (options._root) options._root(vnode, parentDom);

		// We abuse the `replaceNode` parameter in `hydrate()` to signal if we
		// are in hydration mode or not by passing `EMPTY_OBJ` instead of a
		// DOM element.
		let isHydrating = replaceNode === EMPTY_OBJ;

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
			replaceNode && !isHydrating
				? [replaceNode]
				: oldVNode
				? null
				: parentDom.childNodes.length
				? EMPTY_ARR.slice.call(parentDom.childNodes)
				: null,
			commitQueue,
			replaceNode || EMPTY_OBJ,
			isHydrating
		);

		// Flush all queued effects
		commitRoot(commitQueue, vnode);
	}
	return {
		hydrate(vnode) {
			render(vnode, EMPTY_OBJ);
		},
		render
	};
}
