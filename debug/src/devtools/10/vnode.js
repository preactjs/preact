import { Fragment } from 'preact';

/**
 * Check if a `vnode` is the root of a tree
 * @param {import('../../internal').VNode} vnode
 * @returns {boolean}
 */
export function isRoot(vnode) {
	return vnode._parent == null && vnode.type === Fragment;
}

/**
 * Check if a `vnode` represents a `Suspense` component
 * @param {import('../../internal').VNode} vnode
 * @returns {boolean}
 */
export function isSuspenseVNode(vnode) {
	const c = vnode._component;
	return c != null && c._suspensions != null;
}

/**
 * Check if a `vnode` represents a context `Consumer` component
 * @param {import('../../internal').VNode} vnode
 * @returns {boolean}
 */
export function isConsumerVNode(vnode) {
	return getDisplayName(vnode) === 'Consumer';
}

/**
 * Get the internal hooks state of a component
 * @param {import('../../internal').Component} c
 */
/* istanbul ignore next */
export function getComponentHooks(c) {
	return c.__hooks || null;
}

/**
 * Get the diffed children of a `vnode`
 * @param {import('../../internal').VNode} vnode
 * @returns {Array<import('../../internal').VNode | null | undefined>}
 */
export function getActualChildren(vnode) {
	return vnode._children || [];
}

// End Mangle accessors

/**
 * Get the root of a `vnode`
 * @param {import('../../internal').VNode} vnode
 * @returns {import('../../internal').VNode}
 */
export function findRoot(vnode) {
	let next = vnode;
	while ((next = next._parent) != null) {
		/* istanbul ignore else */
		if (isRoot(next)) {
			return next;
		}
	}

	/* istanbul ignore next */
	return vnode;
}

/**
 * Get the ancestor component that rendered the current vnode
 * @param {import('../../internal').VNode} vnode
 */
export function getAncestor(vnode) {
	let next = vnode;
	while ((next = next._parent) != null) {
		return next;
	}

	/* istanbul ignore next */
	return null;
}

/**
 * Get human readable name of the component/dom element
 * @param {import('../../internal').VNode} vnode
 * @returns {string}
 */
/* istanbul ignore next*/
export function getDisplayName(vnode) {
	if (vnode.type === Fragment) return 'Fragment';
	else if (typeof vnode.type === 'function')
		return vnode.type.displayName || vnode.type.name;
	else if (typeof vnode.type === 'string') return vnode.type;
	return '#text';
}
