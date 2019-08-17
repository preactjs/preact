/* istanbul ignore file */
import { Fragment } from 'preact';
import { ElementTypeClass, ElementTypeFunction, ElementTypeHostComponent, ElementTypeMemo, ElementTypeForwardRef } from './constants';
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

let memoReg = /^Memo\(/;
let forwardRefReg = /^ForwardRef\(/;

/**
 * Get the type of a vnode. The devtools uses these constants to differentiate
 * between the various forms of components.
 * @param {import('../internal').VNode} vnode
 */
export function getDevtoolsType(vnode) {
	if (typeof vnode.type=='function' && vnode.type!==Fragment) {
		if (memoReg.test(vnode.type.displayName)) return ElementTypeMemo;
		if (forwardRefReg.test(vnode.type.displayName)) return ElementTypeForwardRef;
		// TODO: Provider and Consumer
		return vnode.type.prototype && vnode.type.prototype.render
			? ElementTypeClass
			: ElementTypeFunction;
	}
	return ElementTypeHostComponent;
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
 * @returns {*}
 */
export function getInstance(vnode) {
	let res;
	// Use the parent element as instance for root nodes
	if (isRoot(vnode)) {
		res = vnode._dom;
	}
	else if (vnode._component!=null) return vnode._component;
	else if (vnode.type===Fragment) return vnode.props;
	else res = vnode._dom;

	if (res===null) {
		console.error(`VNode`, vnode);
		throw new Error(`Could not determine a valid instance for the given vnode. Please report this bug.`);
	}

	return res;
}

/**
 * Get rendered children of a vnode
 * @param {import('../internal').VNode} vnode
 * @returns {import('../internal').VNode[]}
 */
export function getRenderedChildren(vnode) {
	return vnode._children || [];
}

/**
 * Chcck if a vnode has rendered children
 * @param {import('../internal').VNode} vnode
 * @returns {boolean}
 */
export function hasRenderedChildren(vnode) {
	return vnode._children!=null && vnode._children.length > 0;
}

/**
 * Get the parent of a vnode
 * @param {import('../internal').VNode} vnode
 * @returns {import('../internal').VNode | null}
 */
export function getParent(vnode) {
	return vnode._parent;
}

/**
 * Get the ancestor component that rendered the current vnode
 * @param {import('./devtools').FilterState} filters
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
 * @param {import('./devtools').IdMapper} idMapper
 * @param {import('../internal').VNode} vnode
 * @returns {Array<import('../internal').Owner>}
 */
export function getOwners(idMapper, vnode) {
	let owners = [];
	let next = vnode;
	while (next = next._parent) {
		// TODO: Check filtering?
		if (typeof next.type=='function' && next.type!==Fragment) {
			owners.push({
				id: idMapper.getId(next),
				type: getDevtoolsType(next),
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

/**
 * Check if a component has hooks
 * @param {import('../internal').VNode} vnode
 * @returns {boolean}
 */
export function hasHookState(vnode) {
	return vnode._component!=null && vnode._component.__hooks!=null;
}

/**
 * Get vnode props
 * @param {import('../internal').VNode} vnode
 * @returns {Record<string, any>}
 */
export function getVNodeProps(vnode) {
	return vnode.props!=null && Object.keys(vnode.props).length > 0
		? vnode.props
		: null;
}

/**
 * Get state of a component
 * @param {import('../internal').VNode} vnode
 * @returns {Record<string, any> | null}
 */
export function getComponentState(vnode) {
	return vnode._component!=null && Object.keys(vnode._component.state).length > 0
		? vnode._component.state
		: null;
}

/**
 * Get context of a component
 * @param {import('../internal').VNode} vnode
 * @returns {Record<string, any> | null}
 */
export function getComponentContext(vnode) {
	return vnode._component ? vnode._component.context : null;
}

/**
 * Print an element to console
 * @param {import('../internal').VNode | null} vnode
 * @param {number} id vnode id
 */
export function logElementToConsole(vnode, id) {
	if (vnode==null) {
		console.warn(`Could not find vnode with id ${id}`);
		return;
	}

	/* eslint-disable no-console */
	console.group(
		`LOG %c<${getDisplayName(vnode) || 'Component'} />`,
		// CSS Variable is injected by the devtools extension
		'color: var(--dom-tag-name-color); font-weight: normal'
	);
	console.log('props:', vnode.props);
	if (vnode._component) {
		console.log('state:', vnode._component.state);
	}
	console.log('vnode:', vnode);
	console.log('devtools id:', id);
	console.groupEnd();
	/* eslint-enable no-console */
}

/**
 * @param {import('../internal').VNode} vnode
 */
export function getVNodeType(vnode) {
	return vnode.type;
}
