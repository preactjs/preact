import { createRoot } from './create-root';

/**
 * Render a Preact virtual node into a DOM element
 * @param {import('./internal').ComponentChild} vnode The virtual node to render
 * @param {import('./internal').PreactElement} parentDom The DOM element to
 * render into
 */
export function render(vnode, parentDom) {
	let root = parentDom && parentDom._root;
	if (!root) {
		root = createRoot(parentDom);
	}
	parentDom._root = root;
	root.render(vnode);
}

/**
 * Update an existing DOM element with data from a Preact virtual node
 * @param {import('./internal').ComponentChild} vnode The virtual node to render
 * @param {import('./internal').PreactElement} parentDom The DOM element to
 * update
 */
export function hydrate(vnode, parentDom) {
	let root = parentDom && parentDom._root;
	if (!root) {
		root = createRoot(parentDom);
	}
	parentDom._root = root;
	root.hydrate(vnode);
}
