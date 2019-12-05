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
	getActualChildren,
	isConsumerVNode
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
 * The renderer is responsible for translating anything preact rendered
 * into a serializable format that is passed to the devtools extension.
 * On top of that the devtools can call the renderer to request certain
 * information about `vnodes`. This is usually done lazily, so that we
 * don't waste any precious CPU time.
 *
 * Instead of passing `json` objects around, we're converting everythign
 * to a custom format that is representable using a number array. It's one
 * of the major performance improvements the react team made in their devtools
 * v4 code.
 *
 * The translation process always happens after a commit has finished.
 * This has the advantage of not tainting measured timings for rendering
 * `vnodes`. But it has the disadvantage that we need to reconstruct what
 * changes were done in each commit. Nonetheless I do think the additional
 * complexity is worth it, given the better and less confusing user experience.
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

		/**
		 * Print out a `vnode` to the native devtools console. Called when
		 * the bug icon is pressed in the devtools sidebar panel.
		 * @param {number} id
		 * @param {number[]} children
		 */
		/* istanbul ignore next */
		log(id, children) {
			const vnode = ids.getVNode(id);
			if (vnode == null) {
				console.warn(`Could not find vnode with id ${id}`);
				return;
			}
			logVNode(vnode, id, children);
		},

		/**
		 * Retrieve all `vnode` details like `props`, `state` and `context`
		 * to be displayed in the sidebar. We only request this information
		 * when a `vnode` is selected in the devtools extension.
		 * @param {number} id
		 * @returns {import('./types').InspectData | null}
		 */
		inspect(id) {
			const vnode = ids.getVNode(id);
			if (!vnode) return null;

			const c = vnode._component;
			const hasState =
				typeof vnode.type === 'function' &&
				c != null &&
				Object.keys(c.state).length > 0;

			const hasHooks = c != null && getComponentHooks(c) != null;
			let context = null;
			if (c != null) {
				context = isConsumerVNode(vnode)
					? {
							value: c.context
					  }
					: cleanContext(c.context);
			}

			return {
				context: context != null ? jsonify(context, serializeVNode) : null,
				canEditHooks: hasHooks,
				hooks: null,
				id,
				name: getDisplayName(vnode),
				canEditProps: true,
				props: jsonify(cleanProps(vnode.props), serializeVNode),
				canEditState: true,
				state: hasState ? jsonify(c.state, serializeVNode) : null,
				type: getDevtoolsType(vnode)
			};
		},

		/**
		 * Get the DOM nodes associated with a `vnode`. For `Fragments` this can be
		 * a range of nodes (experimental).
		 * @param {number} id
		 * @returns {[HTMLElement | Text | null, HTMLElement | Text | null] | null}
		 */
		findDomForVNode(id) {
			const vnode = ids.getVNode(id);
			return vnode ? [vnode._dom, vnode._lastDomChild] : null;
		},

		/**
		 * Get the `id` associated with a `vnode`.
		 * @param {HTMLElement | Text} node
		 * @returns {number | null}
		 */
		findVNodeIdForDom(node) {
			const vnode = domToVNode.get(node);
			if (vnode) {
				if (shouldFilter(vnode, filters)) {
					let p = vnode;
					while ((p = p._parent) != null) {
						/* istanbul ignore else */
						if (!shouldFilter(p, filters)) break;
					}

					return ids.getId(p);
				}

				return ids.getId(vnode);
			}

			return -1;
		},

		/**
		 * Called when the user changes filtering in the extension.
		 * @param {import('./types').FilterState} nextFilters
		 */
		applyFilters(nextFilters) {
			roots.forEach(root => {
				const children = getActualChildren(root);
				/* istanbul ignore else */
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
				currentUnmounts = [];
				queue.push(unmounts);
			});

			filters.regex = nextFilters.regex;
			filters.type = nextFilters.type;

			roots.forEach(root => {
				const commit = createCommit(ids, roots, root, filters, domToVNode);
				const ev = flush(commit);
				queue.push(ev);
			});

			/* istanbul ignore else */
			if (hook.connected) {
				this.flushInitial();
			}
		},

		/**
		 * Flush all events that may have been queued before the devtools are
		 * done initializing.
		 */
		flushInitial() {
			queue.forEach(ev => hook.emit(ev.name, ev.data));
			hook.connected = true;
			queue = [];
		},

		/**
		 * Main entry function that's called whenever a commit completed. From here
		 * on we walk the view tree and store any changes in an operations array
		 * that the devtools can understand. If we're connected to the extension
		 * we message the events, and if not we'll queue them until the extension
		 * becomes active.
		 * @param {import('../../internal').VNode} vnode
		 */
		onCommit(vnode) {
			const commit = createCommit(ids, roots, vnode, filters, domToVNode);
			commit.unmountIds.push(...currentUnmounts);
			currentUnmounts = [];
			const ev = flush(commit);

			/* istanbul ignore else */
			if (hook.connected) {
				hook.emit(ev.name, ev.data);
			} else {
				queue.push(ev);
			}
		},

		/**
		 * Called when a `vnode` is removed.
		 * @param {import('../../internal').VNode} vnode
		 */
		onUnmount(vnode) {
			if (!shouldFilter(vnode, filters)) {
				/* istanbul ignore else */
				if (ids.hasId(vnode)) {
					currentUnmounts.push(ids.getId(vnode));
				}
			} else if (typeof vnode.type !== 'function') {
				const dom = vnode._dom;
				/* istanbul ignore next */
				if (dom != null) domToVNode.delete(dom);
			}

			ids.remove(vnode);
		},

		/**
		 * Apply an update that was triggered in the extension. That's usually
		 * done via any of the input elements in the sidebar.
		 * @param {number} id
		 * @param {'props' | 'state' | 'context' | 'hooks'} type
		 * @param {Array<string, number>} path
		 * @param {any} value
		 */
		update(id, type, path, value) {
			const vnode = ids.getVNode(id);
			if (vnode !== null) {
				if (typeof vnode.type === 'function') {
					const c = vnode._component;
					/* istanbul ignore else */
					if (type === 'props') {
						/* istanbul ignore next */
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
	};
}

/**
 * Print an element to console
 * @param {import('../../internal').VNode} vnode
 * @param {number} id
 * @param {number[]} children
 */
/* istanbul ignore next */
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
 * Walk a `vnode` tree and compare it with the previous one. If any
 * changes are detected they will be stored in the return value.
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
 * Mount a `vnode`
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

	if (typeof vnode.type !== 'function') {
		const dom = vnode._dom;
		// TODO: Find a test case
		/* istanbul ignore next */
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
		vnode.endTime - vnode.startTime
	);

	ids.update(id, vnode);
	let shouldReorder = false;

	const children = getActualChildren(vnode);
	for (let i = 0; i < children.length; i++) {
		const child = /** @type {*} */ (children[i]);
		if (child == null) {
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
