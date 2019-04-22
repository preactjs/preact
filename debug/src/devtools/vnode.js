import { Fragment } from 'preact';
import { ElementTypeClass, ElementTypeFunction, ElementTypeOtherOrUnknown } from './constants';

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
 * Get all rendered vnode children as an array. Moreover we need to filter
 * out `null` or other falsy children.
 * @param {import('../internal').VNode} vnode
 * @returns {import('../internal').VNode[]}
 */
export function getChildren(vnode) {
	let c = vnode._component;

	if (c==null) {
		return vnode._children!=null ? vnode._children.filter(Boolean) : [];
	}

	return !Array.isArray(c._prevVNode) && c._prevVNode!=null
		? [c._prevVNode]
		: null;
}
