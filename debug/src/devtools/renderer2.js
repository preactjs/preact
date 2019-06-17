import { getVNodeId, getVNode, clearVNode, hasVNodeId } from './cache';
import { TREE_OPERATION_ADD, ElementTypeRoot, TREE_OPERATION_REMOVE, TREE_OPERATION_REORDER_CHILDREN } from './constants';
import { getVNodeType, getDisplayName, getAncestorComponent, getOwners } from './vnode';
import { cleanForBridge } from './pretty';
import { inspectHooks } from './hooks';
import { encode } from './util';
import { getStringId, stringTable, allStrLengths, clearStringTable } from './string-table';
import { shouldFilter } from './filter';
import { isRoot } from './custom';

/**
 * Called when a tree has completed rendering
 * @param {import('../internal').DevtoolsHook} hook
 * @param {import('../internal').AdapterState} state
 * @param {import('../internal').VNode} vnode
 */
export function onCommitFiberRoot(hook, state, vnode) {
	// Empty root
	// if (root.type===Fragment && root._children.length==0) return;

	// TODO: Profiling
	let parentId = 0;
	let ancestor = vnode._parent;
	if (ancestor!=null && hasVNodeId(ancestor)) {
		parentId = getVNodeId(ancestor);
	}

	if (hasVNodeId(vnode)) {
		update(state, vnode, ancestor);
	}
	else {
		mount(state, vnode, null);
	}

	flushPendingEvents(hook, state);
	state.currentRootId = -1;
}

/**
 * Called when a tree will be unmounted
 * @param {import('../internal').DevtoolsHook} hook
 * @param {import('../internal').AdapterState} state
 * @param {import('../internal').VNode} vnode
 */
export function onCommitFiberUnmount(hook, state, vnode) {
	// Check if is root
	recordUnmount(state, vnode);
}

/**
 * @param {import('../internal').AdapterState} state
 * @param {import('../internal').VNode} vnode
 * @param {import('../internal').VNode} vnode
 * @returns {boolean}
 */
export function update(state, vnode, parent) {
	let shouldReset = false;
	let include = !shouldFilter(state.filter, vnode);
	if (include && !hasVNodeId(vnode)) {
		mount(state, vnode, parent);
		shouldReset = true;
	}
	else {
		let children = vnode._children || [];
		for (let i = 0; i < children.length; i++) {
			if (children[i]!==null && update(state, children[i], shouldFilter(state.filter, vnode) ? parent : vnode)) {
				shouldReset = true;
			}
		}
	}

	if (shouldReset) {
		if (include) {
			resetChildren(state, vnode);
			return false;
		}

		return true;
	}

	return false;
}

/**
 * Reset child ordering of a vnode
 * @param {import('../internal').AdapterState} state
 * @param {import('../internal').VNode} vnode
 */
export function resetChildren(state, vnode) {
	// TODO: Infinite loop here
	return;

	/** @type {number[]} */
	let next = [];

	let stack = vnode._children.slice() || [];
	let child;
	while ((child = stack.pop())!=null) {
		if (!shouldFilter(state.filter, child)) {
			next.push(getVNodeId(child));
		}
		else if (vnode._children) {
			stack.push(...vnode._children.slice());
		}
	}

	if (next.length < 2) return;

	state.pending.push(
		TREE_OPERATION_REORDER_CHILDREN,
		getVNodeId(vnode),
		next.length
	);

	for (let i = 0; i < next.length; i++) {
		state.pending.push(next[i]);
	}
}

/**
 * @param {import('../internal').AdapterState} state
 * @param {import('../internal').VNode} vnode
 */
export function unmount(state, vnode) {
	let children = vnode._children || [];
	for (let i = 0; i < children.length; i++) {
		if (children[i]!==null) {
			unmount(state, children[i]);
		}
	}

	if (isRoot(vnode)) {
		state.pendingUnmountRootId = state.currentRootId;
	}
	else if (!shouldFilter(state.filter, vnode)) {
		let id = getVNodeId(vnode);
		state.pendingUnmountIds.push(id);
	}
	// }

	// Root must be last after all children are unmounted
	// let isRoot = vnode._parent==null;
	// if (isRoot) {
	// 	state.pendingUnmountRootId = getVNodeId(vnode);
	// }

	clearVNode(vnode);
}

/**
 * Extracted unmount logic, because this will be called by
 * `handleCommitFiberUnmount` directly during rendering. For that reason
 * it should be as lightweight as possible to not taint profiling timings too
 * much.
 * @param {import('../internal').AdapterState} state
 * @param {import('../internal').VNode} vnode
 */
export function recordUnmount(state, vnode) {
	if (hasVNodeId(vnode)) {
		state.pendingUnmountIds.push(getVNodeId(vnode));
	}
	clearVNode(vnode);
}

/**
 * @param {import('../internal').AdapterState} state
 * @param {import('../internal').VNode} vnode
 * @param {import('../internal').VNode} parent
 */
export function mount(state, vnode, parent) {
	if (!shouldFilter(state.filter, vnode)) {
		recordMount(state, vnode, parent);
	}

	const children = vnode._children || [];
	for (let i = 0; i < children.length; i++) {
		if (children[i]!==null) {
			mount(state, children[i], vnode);
		}
	}
}

/**
 * @param {import('../internal').AdapterState} state
 * @param {import('../internal').VNode} vnode
 * @param {import('../internal').VNode} parent
 */
export function recordMount(state, vnode, parent) {
	let id = getVNodeId(vnode);
	if (isRoot(vnode)) {
		state.pending.push(
			TREE_OPERATION_ADD,
			id,
			ElementTypeRoot,
			1,
			1
		);
	}
	else {
		let ancestor = getAncestorComponent(state, vnode);
		state.pending.push(
			TREE_OPERATION_ADD,
			id,
			getVNodeType(vnode),
			ancestor!=null ? getVNodeId(ancestor) : 0,
			ancestor!=null && !isRoot(ancestor) ? getVNodeId(ancestor) : 0,
			getStringId(getDisplayName(vnode)),
			vnode.key ? getStringId(vnode.key + '') : 0
		);
	}
}

/**
 * Pass all pending operations to the devtools extension
 * @param {import('../internal').DevtoolsHook} hook
 * @param {import('../internal').AdapterState} state
 */
export function flushPendingEvents(hook, state) {
	if (state.pending.length==0 && state.pendingUnmountIds.length==0) return;

	// TODO: Profiling
	if (!state.connected) return;

	// We _must_ set the length on initialization
	let ops = new Uint32Array(
		2 + // Renderer id + root vnode id
		1 + // string table length field
		allStrLengths +
		(state.pendingUnmountIds.length
			// TREE_OPERATION_REMOVE + removed id length
			? 2 + state.pendingUnmountIds.length
			: 0) +
		(state.pendingUnmountRootId===null ? 0 : 1) +
		state.pending.length
	);

	let i = 0;
	ops[i++] = state.rendererId;
	ops[i++] = 1; // TODO: Root vnode id

	// Add string table
	ops[i++] = allStrLengths;
	stringTable.forEach((_, k) => {
		ops[i++] = k.length;
		ops.set(encode(k), i);
		i += k.length;
	});

	if (state.pendingUnmountIds.length) {
		// All unmounts
		ops[i++] = TREE_OPERATION_REMOVE;
		// Total number of unmount ids
		ops[i++] = state.pendingUnmountIds.length;
		for (let j = 0; j < state.pendingUnmountIds.length; j++) {
			ops[i + j] = state.pendingUnmountIds[j];
		}
		i += state.pendingUnmountIds.length;

		if (state.pendingUnmountRootId!==null) {
			ops[i] = state.pendingUnmountRootId;
			i++;
		}
	}

	// Finally add all pending operations
	ops.set(state.pending, i);

	hook.emit('operations', ops);

	state.pending = [];
	state.pendingUnmountIds = [];
	clearStringTable();
}

/**
 * Provide detailed information about the current vnode
 * @param {number} id
 * @returns {import('../internal').InspectData}
 */
export function inspectElement(id) {
	// FIXME: Find out why this function is called in a loop and what we can do
	// to prevent that.
	let vnode = getVNode(id);
	if (vnode==null) {
		throw new Error('Trying to inspect a vnode that was already unmounted. Please report this bug at: https://github.com/developit/preact/issues/new');
	}
	let hasHooks = vnode._component!=null && vnode._component.__hooks!=null;
	let owners = getOwners(vnode);

	return {
		id,
		canEditHooks: hasHooks,
		canEditFunctionProps: true, // TODO
		canToggleSuspense: false, // TODO
		canViewSource: false, // TODO
		displayName: getDisplayName(vnode),
		type: getVNodeType(vnode),
		// context: vnode._component ? cleanForBridge(vnode._component.context) : null, // TODO
		context: null, // TODO
		events: null,
		hooks: hasHooks ? cleanForBridge(inspectHooks(vnode)) : null,
		props: vnode.props!=null && Object.keys(vnode.props).length > 0
			? cleanForBridge(vnode.props)
			: null,
		state: hasHooks || vnode._component==null || !Object.keys(vnode._component.state).length
			? null
			: cleanForBridge(vnode._component.state),
		owners: owners.length ? owners : null,
		source: null // TODO
	};
}
