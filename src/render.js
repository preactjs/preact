import { diffDeps } from './diff/deps';
import { Component, getDomSibling, updateParentDomPointers } from './component';

/**
 * Render a Preact virtual node into a DOM element
 * @param {import('./internal').ComponentChild} vnode The virtual node to render
 * @param {import('./internal').PreactElement} parentDom The DOM element to
 * render into
 * @param {import('./internal').PreactElement | object} [replaceNode] Optional: Attempt to re-use an
 * existing DOM tree rooted at `replaceNode`
 */
export function render(vnode, parentDom, replaceNode) {
	renderCore(vnode, parentDom, replaceNode, getRenderDeps());
}

/**
 * returns dependencies for rendering - isolated so that we can generate async render function
 */
export function getRenderDeps() {
	return diffDeps(Component, getDomSibling, updateParentDomPointers);
}

/**
 * Render a Preact virtual node into a DOM element without dependencies - this is used as basis for the async rendering
 */
export function renderCore(vnode, parentDom, replaceNode, deps) {
	if (deps.options._root) deps.options._root(vnode, parentDom);

	// We abuse the `replaceNode` parameter in `hydrate()` to signal if we are in
	// hydration mode or not by passing the `hydrate` function instead of a DOM
	// element..
	let isHydrating = typeof replaceNode === 'function';

	// To be able to support calling `render()` multiple times on the same
	// DOM node, we need to obtain a reference to the previous tree. We do
	// this by assigning a new `_children` property to DOM nodes which points
	// to the last rendered tree. By default this property is not present, which
	// means that we are mounting a new tree for the first time.
	let oldVNode = isHydrating
		? null
		: (replaceNode && replaceNode._children) || parentDom._children;

	vnode = (
		(!isHydrating && replaceNode) ||
		parentDom
	)._children = deps.createElement(deps.Fragment, null, [vnode]);

	// List of effects that need to be called after diffing.
	let commitQueue = [];
	const generator = deps.diff(
		parentDom,
		// Determine the new vnode tree and store it on the DOM element on
		// our custom `_children` property.
		vnode,
		oldVNode || deps.EMPTY_OBJ,
		deps.EMPTY_OBJ,
		parentDom.ownerSVGElement !== undefined,
		!isHydrating && replaceNode
			? [replaceNode]
			: oldVNode
			? null
			: parentDom.firstChild
			? deps.slice.call(parentDom.childNodes)
			: null,
		commitQueue,
		!isHydrating && replaceNode
			? replaceNode
			: oldVNode
			? oldVNode._dom
			: parentDom.firstChild,
		isHydrating,
		deps
	);
	deps.awaitNextValue(generator);

	// Flush all queued effects
	deps.commitRoot(commitQueue, vnode, deps.options);
}

/**
 * Update an existing DOM element with data from a Preact virtual node
 * @param {import('./internal').ComponentChild} vnode The virtual node to render
 * @param {import('./internal').PreactElement} parentDom The DOM element to
 * update
 */
export function hydrate(vnode, parentDom) {
	render(vnode, parentDom, hydrate);
}
