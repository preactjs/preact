import { createElement } from 'preact';

function Portal(p) {
	return p.children;
}

/**
 * Create a `Portal` to continue rendering the vnode tree at a different DOM node
 * @param {import('./internal').VNode} vnode The vnode to render
 * @param {import('./internal').PreactElement} container The DOM node to continue rendering in to.
 */
export function createPortal(vnode, container) {
	return createElement(Portal, { _parentNode: container }, vnode);
}
