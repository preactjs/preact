import { Fragment } from 'preact';

/**
 * Get human readable name of the component/dom element
 * @param {import('../internal').VNode} vnode
 * @returns {string}
 */
export function getDisplayName(vnode) {
	if (vnode.type===Fragment) return 'Fragment';
	else if (typeof vnode.type==='function') return vnode.type.displayName || vnode.type.name;
	else if (typeof vnode.type==='string') return vnode.type;
	return '#text';
}

/**
 * Get the root of a vnode
 * @param {import('../internal').VNode} vnode
 * @returns {import('../internal').VNode}
 */
export function getRoot(vnode) {
	let next = vnode;
	while (next = next._parent) {
		if (isRoot(next)) {
			return next;
		}
	}

	return vnode;
}

/**
 * Get the ancestor component that rendered the current vnode
 * @param {import('../internal').VNode} vnode
 * @returns {boolean}
 */
export function isRoot(vnode) {
	return vnode.type===Fragment && vnode._parent==null;
}

/**
 * Cache a vnode by its instance and retrieve previous vnodes by the next
 * instance.
 *
 * We need this to be able to identify the previous vnode of a given instance.
 * For components we want to check if we already rendered it and use the class
 * instance as key. For html elements we use the dom node as key.
 *
 * @param {import('../internal').VNode} vnode
 * @returns {import('../internal').VNode | import('../internal').Component | import('../internal').PreactElement | Text | null}
 */
export function getInstance(vnode) {
	// Use the parent element as instance for root nodes
	if (isRoot(vnode)) {
		// Edge case: When the tree only consists of components that have not rendered
		// anything into the DOM we revert to using the vnode as instance.
		return vnode._children.length > 0 && vnode._children[0]!=null && vnode._children[0]._dom!=null
			? /** @type {import('../internal').PreactElement | null} */
			(vnode._children[0]._dom.parentNode)
			: vnode;
	}
	if (vnode._component!=null) return vnode._component;
	if (vnode.type===Fragment) return vnode.props;
	return vnode._dom;
}
