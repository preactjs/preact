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
	// FIXME: Mangling of `_childDidSuspend` is not stable in Preact
	return c != null && c._childDidSuspend != null;
}

/**
 * Get the internal hooks state of a component
 * @param {import('../../internal').Component} c
 */
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
		if (isRoot(next)) {
			return next;
		}
	}

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

	return null;
}

/**
 * Get human readable name of the component/dom element
 * @param {import('../../internal').VNode} vnode
 * @returns {string}
 */
export function getDisplayName(vnode) {
	if (vnode.type === Fragment) return 'Fragment';
	else if (typeof vnode.type === 'function')
		return vnode.type.displayName || vnode.type.name;
	else if (typeof vnode.type === 'string') return vnode.type;
	return '#text';
}
