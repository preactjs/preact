import { Fragment } from 'preact';
import { ElementTypeClass, ElementTypeFunction, ElementTypeHostComponent } from './constants';
import { getVNodeId } from './cache';
import { shouldFilter } from './filter';

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
 * Get the type of a vnode. The devtools uses these constants to differentiate
 * between the various forms of components.
 * @param {import('../internal').VNode} vnode
 */
export function getVNodeType(vnode) {
	if (typeof vnode.type=='function' && vnode.type!==Fragment) {
		// TODO: Memo and ForwardRef
		// TODO: Provider and Consumer
		return vnode.type.prototype && vnode.type.prototype.render
			? ElementTypeClass
			: ElementTypeFunction;
	}
	return ElementTypeHostComponent;
}

/**
 * Get the ancestor component that rendered the current vnode
 * @param {import('../internal').AdapterState["filter"]} filters
 * @param {import('../internal').VNode} vnode
 * @returns {import('../internal').VNode | null}
 */
export function getAncestor(filters, vnode) {
	let next = vnode;
	while (next = next._parent) {
		if (!shouldFilter(filters, next)) {
			return next;
		}
	}

	return null;
}

/**
 * Get the ancestor component that rendered the current vnode
 * @param {import('../internal').VNode} vnode
 * @returns {Array<import('../internal').Owner>}
 */
export function getOwners(vnode) {
	let owners = [];
	let next = vnode;
	while (next = next._parent) {
		// TODO: Check filtering?
		if (typeof next.type=='function' && next.type!==Fragment) {
			owners.push({
				id: getVNodeId(next),
				type: getVNodeType(next),
				displayName: getDisplayName(next)
			});
		}
	}

	return owners;
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
 * Get the nearest display name for a given vnode
 * @param {import('../internal').VNode} vnode
 * @returns {string}
 */
export function getNearestDisplayName(vnode) {
	if (vnode!=null) {
		if (vnode.type!==Fragment) return getDisplayName(vnode);
		if (vnode._children==null) return '';

		for (let i = 0; i < vnode._children.length; i++) {
			let child = vnode._children[i];
			if (child) {
				let name = getNearestDisplayName(child);
				if (name) return name;
			}
		}
	}

	return 'Unknown';
}
