import { getInstance } from './custom';

let uid = 0;

/** Generate an id that will be used to tag vnodes */
export function genUuid() {
	return ++uid;
}

/** @type {WeakMap<any, number> | null} */
let cache = null;

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

	let inst = getInstance(vnode);
	if (!cache.has(inst)) cache.set(inst, genUuid());
	return cache.get(inst);
}
