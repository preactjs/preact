import { createElement } from 'preact';

/**
 * Portal component
 * @this {import('./internal').Component}
 * @param {object | null | undefined} props
 *
 * TODO: use createRoot() instead of fake root
 */
function Portal(props) {
	return props.children;
}

/**
 * Create a `Portal` to continue rendering the vnode tree at a different DOM node
 * @param {import('./internal').VNode} vnode The vnode to render
 * @param {import('./internal').PreactElement} container The DOM node to continue rendering in to.
 */
export function createPortal(vnode, container) {
	// Note: We can't use Fragment here because a component that returned a Portal
	// (e.g. `const App = () => createPortal(...)`) wouldn't work. Our diff
	// collapses Fragments without keys that are returned directly from components
	// into just an array and sets that as the children array of the component.
	//
	// We also can't use keyed Fragments here cuz it might lead to weird edge
	// cases when toggling between two sibling portals if we use a shared keyed or
	// lead to unnecessary re-mounts if trying to generate a new key on each call.
	//
	// So the simplest solution seems to be just to use an unique type for Portal
	// to skip the Fragment collapsing logic when diffing components
	return createElement(Portal, { _parentDom: container }, vnode);
}
