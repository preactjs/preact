import { getInstance } from './custom';

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
	if (!vnodeToId.has(inst)) {
		vnodeToId.set(inst, genUuid());
	}

	let id = vnodeToId.get(inst);
	idToVNode.set(id, vnode);
	return id;
}

/**
 * Check if a vnode was seen before
 * @param {import('../internal').VNode} vnode
 */
export function hasVNodeId(vnode) {
	return vnode!=null && vnodeToId!=null && vnodeToId.has(getInstance(vnode));
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
	let children = vnode._children || [];
	for (let i = 0; i < children.length; i++) {
		if (children[i]!=null) {
			clearVNode(children[i]);
		}
	}

	if (hasVNodeId(vnode)) {
		let id = getVNodeId(vnode);
		if (oldChildren.has(id)) {
			oldChildren.delete(id);
		}
		idToVNode.delete(getVNodeId(vnode));
	}
	vnodeToId.delete(vnode);
}

// Only used for testing
export function clearState() {
	uid = 0;
	vnodeToId = null;
	idToVNode = null;
}

/**
 * We need a way to detect if the child ordering has changed after a render has
 * completed. For that we need to know the previous vnode's children. Trouble
 * is that we don't store a reference to the previous vnode anywhere in preact.
 * That's why we'll use this map to cache the previous children relation of a
 * vnode. Note that we don't care about anything else, so we can effectively
 * skip storing the whole vnode and just store the id.
 * @type {Map<number, number[]> | null}
 */
let oldChildren = new Map();

/**
 * Add a child to a parent representing the filtered tree
 * @param {number} parentId The parent to add the child to
 * @param {number} childId The child to add to the parent
 */
export function addChildToParent(parentId, childId) {
	if (oldChildren.has(parentId)) {
		oldChildren.get(parentId).push(childId);
	}
}

/**
 * Get the previous children ids
 * @param {import('../internal').VNode} vnode The vnode whose children to retrieve
 * @returns {number[]}
 */
export function getPreviousChildrenIds(vnode) {
	if (!hasVNodeId(vnode)) return [];
	let id = getVNodeId(vnode);
	return oldChildren.has(id) ? oldChildren.get(id) : [];
}
