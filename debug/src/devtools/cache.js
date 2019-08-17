import { getInstance, getRenderedChildren } from './vnode';

/**
 * VNode relationships are encoded as simple numbers for the devtools. We use
 * this function to keep track of existing id's and create new ones if needed.
 * @returns {import('./devtools').IdMapper}
 */
export function createIdMapper() {
	const vnodeToId = new WeakMap();
	const idToVNode = new Map();
	 // Must never be 0, otherwise an infinite loop will be trigger inside
	 // the devtools extension ¯\_(ツ)_/¯
	let uuid = 1;

	const getVNode = id => idToVNode.get(id) || null;
	const hasId = vnode => {
		if (vnode!=null) {
			return vnodeToId.has(getInstance(vnode));
		}
		return null;
	};
	const getId = vnode => {
		let inst = getInstance(vnode);
		if (!vnodeToId.has(inst)) vnodeToId.set(inst, uuid++);
		let id = vnodeToId.get(inst);
		idToVNode.set(id, vnode);
		return id;
	};
	const remove = vnode => {
		if (hasId(vnode)) {
			const id = getId(vnode);
			idToVNode.delete(id);
			vnodeToId.delete(getInstance);
		}
	};

	return { getVNode, hasId, getId, remove };
}

/**
 * Remove a vnode from all caches
 * @param {import('./devtools').IdMapper} mapper
 * @param {import('./devtools').Linker} linker
 * @param {import('../internal').VNode} vnode The vnode to remove
 */
export function clearVNode(mapper, linker, vnode) {
	let children = getRenderedChildren(vnode);
	for (let i = 0; i < children.length; i++) {
		if (children[i]!=null) {
			clearVNode(mapper, linker, children[i]);
		}
	}

	if (mapper.hasId(vnode)) {
		linker.remove(mapper.getId(vnode));
	}
	mapper.remove(vnode);
}

/**
 * We need a way to detect if the child ordering has changed after a render has
 * completed. For that we need to know the previous vnode's children. Trouble
 * is that we don't store a reference to the previous vnode anywhere in preact.
 * That's why we'll use this map to cache the previous children relation of a
 * vnode. Note that we don't care about anything else, so we can effectively
 * skip storing the whole vnode and just store the id.
 *
 * @returns {import('./devtools').Linker}
 */
export function createLinker() {
	const m = new Map();
	const u = new Map();

	const get = id => m.get(id) || [];
	const remove = id => {
		m.delete(id);
		if (u.has(id)) {
			u.get(id).forEach(parent => unlink(parent, id));
			u.delete(id);
		}
	};
	const link = (parent, child) => {
		if (!m.has(parent)) m.set(parent, []);
		m.get(parent).push(child);

		if (!u.has(child)) u.set(child, []);
		u.get(child).push(parent);
	};
	const unlink = (parent, child) => {
		if (m.has(parent)) {
			m.set(parent, m.get(parent).filter(id => id!=child));
		}
	};

	return { link, unlink, remove, get };
}
