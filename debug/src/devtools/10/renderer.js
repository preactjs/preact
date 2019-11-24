import { Fragment } from 'preact';
import { createIdMapper } from './IdMapper';
import { getStringId, flushTable } from './string-table';
import {
	isRoot,
	findRoot,
	getAncestor,
	isSuspenseVNode,
	getDisplayName,
	getComponentHooks,
	getActualChildren
} from './vnode';
import { shouldFilter } from './filter';
import { cleanContext, jsonify, cleanProps, traverse, setIn } from './utils';
import {
	MEMO,
	FORWARD_REF,
	SUSPENSE,
	CLASS_COMPONENT,
	FUNCTION_COMPONENT,
	HTML_ELEMENT,
	REMOVE_VNODE,
	ADD_ROOT,
	ADD_VNODE,
	UPDATE_VNODE_TIMINGS,
	REORDER_CHILDREN
} from './constants';

let memoReg = /^Memo\(/;
let forwardRefReg = /^ForwardRef\(/;
/**
 * Get the type of a vnode. The devtools uses these constants to differentiate
 * between the various forms of components.
 *
 * @param {import('../../internal').VNode} vnode
 * @returns {number}
 */
export function getDevtoolsType(vnode) {
	if (typeof vnode.type == 'function' && vnode.type !== Fragment) {
		const name = getDisplayName(vnode);
		if (memoReg.test(name)) return MEMO;
		if (forwardRefReg.test(name)) return FORWARD_REF;
		if (isSuspenseVNode(vnode)) return SUSPENSE;

		// TODO: Provider and Consumer
		return vnode.type.prototype && vnode.type.prototype.render
			? CLASS_COMPONENT
			: FUNCTION_COMPONENT;
	}
	return HTML_ELEMENT;
}

/**
 * Check if a variable is a `vnode`
 * @param {*} x
 * @returns {boolean}
 */
export function isVNode(x) {
	return x != null && x.type !== undefined && x._dom !== undefined;
}

/**
 * Serialize a vnode
 * @param {*} x
 * @returns {import('./types').SerializedVNode |null}
 */
export function serializeVNode(x) {
	if (isVNode(x)) {
		return {
			type: 'vnode',
			name: getDisplayName(x)
		};
	}

	return null;
}

/**
 * Collect all relevant data from a commit and convert it to a message
 * the detools can understand
 * @param {import('./types').Commit} commit
 */
export function flush(commit) {
	const { rootId, unmountIds, operations, strings } = commit;
	if (unmountIds.length === 0 && operations.length === 0) return;

	let msg = [rootId, ...flushTable(strings)];
	if (unmountIds.length > 0) {
		msg.push(REMOVE_VNODE, unmountIds.length, ...unmountIds);
	}
	msg.push(...operations);

	return { name: 'operation', data: msg };
}

/** @type {import('./types').FilterState} */
let defaultFilters = {
	regex: [],
	type: new Set(['dom', 'fragment'])
};

/**
 *
 * @param {import('./types').PreactDevtoolsHook} hook
 * @param {import('./types').FilterState} filters
 * @returns {import('./types').Renderer}
 */
export function createRenderer(hook, filters = defaultFilters) {
	const ids = createIdMapper();

	/** @type {Set<import('../../internal').VNode>} */
	const roots = new Set();

	/**
	 * Queue events until the extension is connected
	 * @type {import('./types').DevtoolsEvent[]}
	 */
	let queue = [];

	/** @type {number[]} */
	let currentUnmounts = [];

	/** @type {WeakMap<HTMLElement | Text, import('../../internal').VNode>} */
	let domToVNode = new WeakMap();
	return {
		getVNodeById: id => ids.getVNode(id),
		has: id => ids.has(id),
		getDisplayName,
		forceUpdate: id => {
			const vnode = ids.getVNode(id);
			if (vnode) {
				const c = vnode._component;
				if (c) c.forceUpdate();
			}
		},
		log(id, children) {
			const vnode = ids.getVNode(id);
			if (vnode == null) {
				console.warn(`Could not find vnode with id ${id}`);
				return;
			}
			logVNode(/** @type {*} */ (vnode), id, children);
		},
		inspect(id) {
			const vnode = ids.getVNode(id);
			if (!vnode) return null;

			const c = vnode._component;
			const hasState =
				typeof vnode.type === 'function' &&
				c != null &&
				Object.keys(c.state).length > 0;

			const hasHooks = c != null && getComponentHooks(c) != null;
			const context = c != null ? cleanContext(c.context) : null;

			return {
				context,
				canEditHooks: hasHooks,
				hooks: null,
				id,
				name: getDisplayName(vnode),
				canEditProps: true,
				props:
					vnode.type !== null
						? jsonify(cleanProps(vnode.props), serializeVNode)
						: null,
				canEditState: true,
				state: hasState ? jsonify(c.state, serializeVNode) : null,
				type: 2
			};
		},
		findDomForVNode(id) {
			const vnode = ids.getVNode(id);
			return vnode ? [vnode._dom, vnode._lastDomChild] : null;
		},
		findVNodeIdForDom(node) {
			const vnode = domToVNode.get(node);
			if (vnode) {
				if (shouldFilter(vnode, filters)) {
					let p = vnode;
					while ((p = p._parent) != null) {
						if (!shouldFilter(p, filters)) break;
					}

					if (p != null) {
						return ids.getId(p) || -1;
					}
				} else {
					return ids.getId(vnode) || -1;
				}
			}

			return -1;
		},
		applyFilters(nextFilters) {
			roots.forEach(root => {
				const children = getActualChildren(root);
				if (children.length > 0 && children[0] != null) {
					traverse(/** @type{*} */ (children[0]), vnode =>
						this.onUnmount(vnode)
					);
				}

				/** @type {import('./types').Commit} */
				const commit = {
					operations: [],
					rootId: ids.getId(root),
					strings: new Map(),
					unmountIds: currentUnmounts
				};

				const unmounts = flush(commit);
				if (unmounts) {
					currentUnmounts = [];
					queue.push(unmounts);
				}
			});

			filters.regex = nextFilters.regex;
			filters.type = nextFilters.type;

			roots.forEach(root => {
				const commit = createCommit(ids, roots, root, filters, domToVNode);
				const ev = flush(commit);
				if (!ev) return;
				queue.push(ev);
			});

			if (hook.connected) {
				this.flushInitial();
			}
		},
		flushInitial() {
			queue.forEach(ev => hook.emit(ev.name, ev.data));
			hook.connected = true;
			queue = [];
		},
		onCommit(vnode) {
			const commit = createCommit(ids, roots, vnode, filters, domToVNode);
			commit.unmountIds.push(...currentUnmounts);
			currentUnmounts = [];
			const ev = flush(commit);
			if (!ev) return;

			if (hook.connected) {
				hook.emit(ev.name, ev.data);
			} else {
				queue.push(ev);
			}
		},
		onUnmount(vnode) {
			if (!shouldFilter(vnode, filters)) {
				if (ids.hasId(vnode)) {
					currentUnmounts.push(ids.getId(vnode));
				}
			} else if (typeof vnode.type !== 'function') {
				const dom = vnode._dom;
				if (dom != null) domToVNode.delete(dom);
			}

			ids.remove(vnode);
		},
		update(id, type, path, value) {
			const vnode = ids.getVNode(id);
			if (vnode !== null) {
				if (typeof vnode.type === 'function') {
					const c = vnode._component;
					if (c) {
						if (type === 'props') {
							setIn(vnode.props || {}, path.slice(), value);
						} else if (type === 'state') {
							setIn(c.state || {}, path.slice(), value);
						} else if (type === 'context') {
							setIn(c.context || {}, path.slice(), value);
						}

						c.forceUpdate();
					}
				}
			}
		}
	};
}

/**
 * Print an element to console
 * @param {import('../../internal').VNode} vnode
 * @param {number} id
 * @param {number[]} children
 */
export function logVNode(vnode, id, children) {
	const display = getDisplayName(vnode);
	const name = display === '#text' ? display : `<${display || 'Component'} />`;

	/* eslint-disable no-console */
	console.group(`LOG %c${name}`, 'color: #ea88fd; font-weight: normal');
	console.log('props:', vnode.props);
	const c = vnode._component;
	if (c != null) {
		console.log('state:', c.state);
	}
	console.log('vnode:', vnode);
	console.log('devtools id:', id);
	console.log('devtools children:', children);
	console.groupEnd();
	/* eslint-enable no-console */
}

/**
 *
 * @param {import('./types').IdMapper} ids
 * @param {Set<import('../../internal').VNode>} roots
 * @param {import('../../internal').VNode} vnode
 * @param {import('./types').FilterState} filters
 * @param {WeakMap<HTMLElement | Text, import('../../internal').VNode>} filters
 * @returns {import('./types').Commit}
 */
export function createCommit(ids, roots, vnode, filters, domCache) {
	const commit = {
		operations: [],
		rootId: -1,
		strings: new Map(),
		unmountIds: []
	};

	let parentId = -1;

	const isNew = !ids.hasId(vnode);

	if (isRoot(vnode)) {
		const rootId = !isNew ? ids.getId(vnode) : ids.createId(vnode);
		parentId = commit.rootId = rootId;
		roots.add(vnode);
	} else {
		const root = findRoot(vnode);
		commit.rootId = ids.getId(root);
		parentId = ids.getId(getAncestor(vnode));
	}

	if (isNew) {
		mount(ids, commit, vnode, parentId, filters, domCache);
	} else {
		update(ids, commit, vnode, parentId, filters, domCache);
	}

	return commit;
}

/**
 * M
 * @param {import('./types').IdMapper} ids
 * @param {import('./types').Commit} commit
 * @param {import('../../internal').VNode} vnode
 * @param {number} ancestorId
 * @param {import('./types').FilterState} filters
 * @param {WeakMap<HTMLElement | Text, import('../../internal').VNode>} filters
 */
export function mount(ids, commit, vnode, ancestorId, filters, domCache) {
	const root = isRoot(vnode);

	const skip = shouldFilter(vnode, filters);
	if (root || !skip) {
		const id = ids.hasId(vnode) ? ids.getId(vnode) : ids.createId(vnode);
		if (isRoot(vnode)) {
			commit.operations.push(ADD_ROOT, id);
		}

		commit.operations.push(
			ADD_VNODE,
			id,
			getDevtoolsType(vnode), // Type
			ancestorId,
			9999, // owner
			getStringId(commit.strings, getDisplayName(vnode)),
			vnode.key ? getStringId(commit.strings, vnode.key) : 0
		);
		ancestorId = id;
	}

	if (skip && typeof vnode.type !== 'function') {
		const dom = vnode._dom;
		if (dom) domCache.set(dom, vnode);
	}

	const children = getActualChildren(vnode);
	for (let i = 0; i < children.length; i++) {
		const child = /** @type {*} */ (children[i]);
		if (child != null) {
			mount(ids, commit, child, ancestorId, filters, domCache);
		}
	}
}

/**
 * Mark parent vnode for recalculation of children
 * @param {import('./types').IdMapper} ids
 * @param {import('./types').Commit} commit
 * @param {import('../../internal').VNode} vnode
 * @param {number} ancestorId
 * @param {import('./types').FilterState} filters
 * @param {WeakMap<HTMLElement | Text, import('../../internal').VNode>} filters
 */
export function update(ids, commit, vnode, ancestorId, filters, domCache) {
	const skip = shouldFilter(vnode, filters);
	if (skip) {
		const children = getActualChildren(vnode);
		for (let i = 0; i < children.length; i++) {
			const child = /** @type {*} */ (children[i]);
			if (child != null) {
				update(ids, commit, child, ancestorId, filters, domCache);
			}
		}
		return;
	}

	if (!ids.hasId(vnode)) {
		mount(ids, commit, vnode, ancestorId, filters, domCache);
		return true;
	}

	const id = ids.getId(vnode);
	commit.operations.push(
		UPDATE_VNODE_TIMINGS,
		id,
		(vnode.endTime || 0) - (vnode.startTime || 0)
	);

	const oldVNode = ids.getVNode(id);
	ids.update(id, vnode);

	const oldChildren = oldVNode
		? getActualChildren(oldVNode).map(v => v && ids.getId(v))
		: [];

	let shouldReorder = false;

	const children = getActualChildren(vnode);
	for (let i = 0; i < children.length; i++) {
		const child = /** @type {*} */ (children[i]);
		if (child == null) {
			if (oldChildren[i] != null) {
				commit.unmountIds.push(oldChildren[i]);
			}
		} else if (ids.hasId(child) || shouldFilter(child, filters)) {
			update(ids, commit, child, id, filters, domCache);
			// TODO: This is only sometimes necessary
			shouldReorder = true;
		} else {
			mount(ids, commit, child, id, filters, domCache);
			shouldReorder = true;
		}
	}

	if (shouldReorder) {
		resetChildren(commit, ids, id, vnode, filters);
	}
}

/**
 * Mark parent vnode for recalculation of children
 * @param {import('./types').Commit} commit
 * @param {import('./types').IdMapper} ids
 * @param {number} id
 * @param {import('../../internal').VNode} vnode
 * @param {import('./types').FilterState} filters
 */
export function resetChildren(commit, ids, id, vnode, filters) {
	let children = getActualChildren(vnode);
	if (!children.length) return;

	let next = getFilteredChildren(vnode, filters);
	if (next.length < 2) return;

	commit.operations.push(
		REORDER_CHILDREN,
		id,
		next.length,
		...next.map(x => ids.getId(x))
	);
}

/**
 * Traverse over children that are filtered away
 * @param {import('../../internal').VNode} vnode
 * @param {import('./types').FilterState} filters
 * @returns {import('../../internal').VNode[]}
 */
export function getFilteredChildren(vnode, filters) {
	const children = getActualChildren(vnode);
	const stack = children.slice();

	/** @type {import('../../internal').VNode[]} */
	const out = [];

	/** @type {import('../../internal').VNode<any>} */
	let child;
	while (stack.length) {
		child = /** @type {*} */ (stack.pop());
		if (child != null) {
			if (!shouldFilter(child, filters)) {
				out.push(child);
			} else {
				const nextChildren = getActualChildren(child);
				if (nextChildren.length > 0) {
					stack.push(...nextChildren.slice());
				}
			}
		}
	}

	return out.reverse();
}
