import { getVNodeId, getVNode, clearVNode, hasVNodeId } from './cache';
import { TREE_OPERATION_ADD, ElementTypeRoot, TREE_OPERATION_REMOVE, TREE_OPERATION_REORDER_CHILDREN } from './constants';
import { getVNodeType, getDisplayName, getAncestorComponent, getOwners } from './vnode';
import { cleanForBridge } from './pretty';
import { inspectHooks } from './hooks';
import { encode } from './util';
import { getStringId, stringTable, allStrLengths, clearStringTable } from './string-table';
import { shouldFilter } from './filter';

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
		update(state, vnode, false, parentId);
	}
	else {
		mount(state, vnode, true, parentId);
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
	unmount(state, vnode, false);
}

/**
 * @param {import('../internal').AdapterState} state
 * @param {import('../internal').VNode} vnode
 * @param {boolean} isRoot
 * @param {number} parentId
 * @returns {boolean}
 */
export function update(state, vnode, isRoot, parentId) {
	let shouldReset = false;
	let include = !shouldFilter(state.filter, vnode);
	if (include && !hasVNodeId(vnode)) {
		mount(state, vnode, isRoot, parentId);
		shouldReset = true;
	}
	else {
		let children = vnode._children || [];
		for (let i = 0; i < children.length; i++) {
			if (children[i]!==null && update(state, children[i], false, shouldFilter(state.filter, vnode) ? parentId : getVNodeId(vnode))) {
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

	/** @type {number[]} */
	let next = [];

	let stack = vnode._children || [];
	let child;
	while ((child = stack.pop())!=null) {
		if (!shouldFilter(state.filter, child)) {
			next.push(getVNodeId(child));
		}
		else if (vnode._children) {
			stack.push(...vnode._children);
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
 * @param {boolean} isRoot Mark a root as they need to be mounted differently
 */
export function unmount(state, vnode, isRoot) {
	console.log("unmount", getDisplayName(vnode), getVNodeId(vnode))
	if (hasVNodeId(vnode) && isRoot) {
		state.pending.push([
			TREE_OPERATION_REMOVE,
			1, // Remove 1 item
			getVNodeId(vnode)
		]);
	}
	else {
		let children = vnode._children || [];
		for (let i = 0; i < children.length; i++) {
			if (children[i]!==null) {
				unmount(state, children[i], false);
			}
		}

		if (!shouldFilter(state.filter, vnode)) {
			let id = getVNodeId(vnode);
			state.pendingUnmountIds.push(id);
		}
	}

	clearVNode(vnode);
}

/**
 * @param {import('../internal').AdapterState} state
 * @param {import('../internal').VNode} vnode
 * @param {boolean} isRoot Mark a root as they need to be mounted differently
 * @param {number} [parentId]
 */
export function mount(state, vnode, isRoot, parentId) {
	let id;
	let ancestor = getAncestorComponent(vnode);
	let owner = ancestor!=null ? getVNodeId(ancestor) : 0;

	if (isRoot || !shouldFilter(state.filter, vnode)) {
		id = getVNodeId(vnode);
		console.log("mount", getDisplayName(vnode), id, "owner", owner)

		// FIXME: Add proper root detection
		if (isRoot && id < 10) {
			state.pending.push(
				TREE_OPERATION_ADD,
				id,
				ElementTypeRoot,
				1, // Flag to signal that the vnode supports profiling
				owner // We have no special owner meta data for roots
			);
		}
		else {
			state.pending.push(
				TREE_OPERATION_ADD,
				id,
				getVNodeType(vnode),
				parentId || 0,
				owner,
				getStringId(getDisplayName(vnode)),
				vnode.key ? getStringId(vnode.key + '') : 0
			);
		}
	}

	const children = vnode._children || [];
	for (let i = 0; i < children.length; i++) {
		if (children[i]!==null) {
			mount(state, children[i], false, !isRoot && shouldFilter(state.filter, vnode) ? parentId : id);
		}
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
