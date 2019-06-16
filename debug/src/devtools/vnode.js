import { Fragment } from 'preact';
import { ElementTypeClass, ElementTypeFunction, ElementTypeOtherOrUnknown } from './constants';
import { getVNodeId } from './cache';

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
	return ElementTypeOtherOrUnknown;
}

/**
 * Get the ancestor component that rendered the current vnode
 * @param {import('../internal').VNode} vnode
 * @returns {import('../internal').VNode | null}
 */
export function getAncestorComponent(vnode) {
	let next = vnode;
	while (next = next._parent) {
		if (typeof next.type=='function') {
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
