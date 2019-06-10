/**
 * Functions for inspecting a rendered VNode tree.
 */

/**
 * Return the VNode that was most recently rendered into a DOM container using
 * `render`.
 *
 * The rendered children of the returned VNode can be inspected using
 * `getLastRenderOutput`.
 *
 * @return {VNode|null}
 */
export function getVNodeFromContainer(container) {
	return container._children || null;
}

/**
 * Return the most recent rendered output from a component or vnode.
 *
 * Returns `null` if the component or vnode has not been rendered.
 *
 * @param {Component|VNode} component
 * @return {VNode[]|null}
 */
export function getLastRenderOutput(componentOrVNode) {
	const vnode = componentOrVNode._vnode || componentOrVNode;
	return vnode._children || null;
}

/**
 * Return the DOM node produced by rendering a VNode.
 *
 * Returns `null` if the vnode did not produce a DOM node or if it has not
 * been rendered.
 *
 * @param {VNode}
 * @return {Node|null}
 */
export function getDOMNode(vnode) {
	if (typeof vnode.type === 'function' || vnode.type == null) {
		return null;
	}
	return vnode._dom || null;
}

/**
 * Return the `Component` instance produced by rendering a VNode.
 *
 * Returns `null` if the vnode did not produce a Component instance or has
 * not been rendered.
 *
 * @param {VNode}
 * @return {Component|null}
 */
export function getComponent(vnode) {
	return vnode._component || null;
}
