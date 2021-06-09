import { EMPTY_OBJ } from './constants';
import { commitRoot, diff } from './diff/index';
import { createVNode, Fragment } from './create-element';
import options from './options';
import { slice } from './util';

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
	let commitQueue = [];

	// We abuse the `replaceNode` parameter in `hydrate()` to signal if we are in
	// hydration mode or not by passing `false` instead of a DOM element..
	let isHydrating = replaceNode === false;

	// To be able to support calling `render()` multiple times on the same
	// DOM node, we need to obtain a reference to the previous tree. We do
	// this by assigning a new `_children` property to DOM nodes which points
	// to the last rendered tree. By default this property is not present, which
	// means that we are mounting a new tree for the first time.
	let oldVNode = isHydrating
		? null
		: (replaceNode && replaceNode._children) || parentDom._children;

	vnode = (replaceNode || parentDom)._children = createVNode(
		Fragment,
		{ children: [vnode] },
		null,
		null
	);

	diff(
		parentDom,
		// Determine the new vnode tree and store it on the DOM element on
		// our custom `_children` property.
		vnode,
		oldVNode || EMPTY_OBJ,
		EMPTY_OBJ,
		parentDom.ownerSVGElement !== undefined,
		replaceNode
			? [replaceNode]
			: oldVNode
			? null
			: parentDom.firstChild
			? slice.call(parentDom.childNodes)
			: null,
		commitQueue,
		replaceNode || (oldVNode ? oldVNode._dom : parentDom.firstChild),
		isHydrating
	);

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
	render(vnode, parentDom, false);
}
