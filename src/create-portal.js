import { createElement } from './create-element';

/**
 * Portal component. A unique type is used instead of Fragment so that a
 * portal returned directly from a component isn't collapsed into the
 * component's children array by the Fragment unwrapping in `diff()`.
 * @param {object} props
 */
function Portal(props) {
	return props.children;
}

/**
 * Create a `Portal` to continue rendering the vnode tree at a different DOM node
 * @param {import('./internal').ComponentChildren} vnode The vnode to render
 * @param {import('./internal').PreactElement} container The DOM node to continue rendering in to
 */
export function createPortal(vnode, container) {
	return createElement(Portal, { _parentDom: container }, vnode);
}
