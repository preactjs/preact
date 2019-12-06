/**
 * VNode relationships are encoded as simple numbers for the devtools. We use
 * this function to keep track of existing id's and create new ones if needed.
 * @returns {import('./types').IdMapper}
 */
export function createIdMapper() {
	/** @type {Map<any, number>} */
	const instToId = new Map();

	/** @type {Map<number, import('../../internal').VNode>} */
	const idToVNode = new Map();

	/** @type {Map<number, any>} */
	const idToInst = new Map();

	let nextId = 1;

	/** @type {import('./types').IdMapper["getVNode"]} */
	const getVNode = id => idToVNode.get(id) || null;

	/** @type {import('./types').IdMapper["hasId"]} */
	const hasId = vnode => {
		/* istanbul ignore next */
		if (vnode != null) {
			return instToId.has(getInstance(vnode));
		}
		/* istanbul ignore next */
		return false;
	};

	/** @type {import('./types').IdMapper["getId"]} */
	const getId = vnode => {
		/* istanbul ignore next */
		if (vnode == null) return -1;
		const inst = getInstance(vnode);
		return /* istanbul ignore next */ instToId.get(inst) || -1;
	};

	/** @type {import('./types').IdMapper["update"]} */
	const update = (id, vnode) => {
		const inst = getInstance(vnode);
		idToInst.set(id, inst);
		idToVNode.set(id, vnode);
	};

	/** @type {import('./types').IdMapper["remove"]} */
	const remove = vnode => {
		if (hasId(vnode)) {
			const id = getId(vnode);
			idToInst.delete(id);
			idToVNode.delete(id);
		}
		const inst = getInstance(vnode);
		instToId.delete(inst);
	};

	/** @type {import('./types').IdMapper["createId"]} */
	const createId = vnode => {
		const id = nextId++;
		const inst = getInstance(vnode);
		instToId.set(inst, id);
		idToInst.set(id, inst);
		idToVNode.set(id, vnode);
		return id;
	};

	/** @type {import('./types').IdMapper["has"]} */
	const has = id => idToInst.has(id);

	return { has, update, getVNode, hasId, createId, getId, remove };
}

/**
 *
 * @param {import('../../internal').VNode} vnode
 */
export function getInstance(vnode) {
	// For components we use the instance to check refs, otherwise
	// we'll use a dom node
	if (typeof vnode.type === 'function') {
		return vnode._component;
	}

	return vnode._dom;
}
