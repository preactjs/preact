import { createPortal as corePortal } from 'preact';

/**
 * Create a `Portal` to continue rendering the vnode tree at a different DOM node
 * @param {import('./internal').VNode} vnode The vnode to render
 * @param {import('./internal').PreactElement} container The DOM node to continue rendering in to.
 */
export function createPortal(vnode, container) {
	const el = corePortal(vnode, container);
	el.containerInfo = container;
	return el;
}
