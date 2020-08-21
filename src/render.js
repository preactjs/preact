import { EMPTY_OBJ, EMPTY_ARR } from './constants';
import { commitRoot, diff } from './diff/index';
import { createElement, Root } from './create-element';
import options from './options';

const IS_HYDRATE = EMPTY_OBJ;

/**
 *
 * @param {import('./internal').PreactElement} parentDom The DOM element to
 */
export function createRoot(parentDom) {
	let oldRoot = null;
	function render(vnode, replaceNode) {
		if (options._root) options._root(vnode, parentDom);

		// We abuse the `replaceNode` parameter in `hydrate()` to signal if we
		// are in hydration mode or not by passing `IS_HYDRATE` instead of a
		// DOM element.
		let isHydrating = replaceNode === IS_HYDRATE;

		// To be able to support calling `render()` multiple times on the same
		// DOM node, we need to obtain a reference to the previous tree. We do
		// this by assigning a new `_children` property to DOM nodes which points
		// to the last rendered tree. By default this property is not present, which
		// means that we are mounting a new tree for the first time.
		let oldVNode = isHydrating ? null : oldRoot;
		vnode = createElement(Root, { _parentDom: parentDom }, [vnode]);
		// TODO: this is temp for getDomSibling & compat render
		(isHydrating ? parentDom : parentDom || replaceNode)._children = vnode;

		// List of effects that need to be called after diffing.
		let commitQueue = [];

		diff(
			parentDom,
			// Determine the new vnode tree and store it on the DOM element on
			// our custom `_children` property.
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
			render(vnode, IS_HYDRATE);
		},
		render
	};
}
