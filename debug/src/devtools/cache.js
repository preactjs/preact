import { getInstance } from './custom';

let uid = 0;

/** Generate an id that will be used to tag vnodes */
export function genUuid() {
	return ++uid;
}

/** @type {WeakMap<any, number> | null} */
let cache = null;

/** @type {Map<number, import('../internal').VNode> | null} */
let cacheVNode = null;

/**
 * Get the unique id of a vnode
 * @param {import('../internal').VNode} vnode
 */
export function getVNodeId(vnode) {
	// Lazily initialize cache so that IE11 won't crash when `preact/debug` was
	// imported somewhere
	if (cache==null) {
		cache = new WeakMap();
	}
	if (cacheVNode==null) {
		cacheVNode = new Map();
	}

	let inst = getInstance(vnode);
	if (!cache.has(inst)) cache.set(inst, genUuid());

	let id = cache.get(inst);
	cacheVNode.set(id, vnode);
	return id;
}

/**
 * Get a vnode by id
 * @param {number} id
 * @returns {import('../internal').VNode | null}
 */
export function getVNode(id) {
	return cacheVNode.get(id) || null;
}

// Only used for testing
export function clearState() {
	uid = 0;
	cache = null;
	cacheVNode = null;
}
