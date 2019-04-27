import { getInstance } from './custom';
import { getChildren } from './vnode';

let uid = 0;

/** Generate an id that will be used to tag vnodes */
export function genUuid() {
	return ++uid;
}

/** @type {WeakMap<any, number> | null} */
let vnodeToId = null;

/** @type {Map<number, import('../internal').VNode> | null} */
let idToVNode = null;

/**
 * Get the unique id of a vnode
 * @param {import('../internal').VNode} vnode
 */
export function getVNodeId(vnode) {
	// Lazily initialize cache so that IE11 won't crash when `preact/debug` was
	// imported somewhere
	if (vnodeToId==null) {
		vnodeToId = new WeakMap();
	}
	if (idToVNode==null) {
		idToVNode = new Map();
	}

	let inst = getInstance(vnode);
	if (!vnodeToId.has(inst)) vnodeToId.set(inst, genUuid());

	let id = vnodeToId.get(inst);
	idToVNode.set(id, vnode);
	return id;
}

/**
 * Check if a vnode was seen before
 * @param {import('../internal').VNode} vnode
 */
export function hasVNodeId(vnode) {
	return vnodeToId!=null && vnodeToId.has(vnode);
}

/**
 * Get a vnode by id
 * @param {number} id
 * @returns {import('../internal').VNode | null}
 */
export function getVNode(id) {
	return idToVNode.get(id) || null;
}

/**
 * Remove a vnode from all caches
 * @param {import('../internal').VNode} vnode The vnode to remove
 */
export function clearVNode(vnode) {
	let children = getChildren(vnode);
	for (let i = 0; i < children.length; i++) {
		clearVNode(children[i]);
	}
	idToVNode.delete(getVNodeId(vnode));
	vnodeToId.delete(vnode);
}

// Only used for testing
export function clearState() {
	uid = 0;
	vnodeToId = null;
	idToVNode = null;
}
