import { Fragment } from 'preact';
import { getVNodeId, getVNode, clearVNode, hasVNodeId } from './cache';
import { TREE_OPERATION_ADD, ElementTypeRoot, TREE_OPERATION_REMOVE, TREE_OPERATION_REORDER_CHILDREN } from './constants';
import { getChildren, getVNodeType, getDisplayName } from './vnode';
import { cleanForBridge } from './pretty';
import { inspectHooks } from './hooks';
import { encode } from './util';
import { getStringId, stringTable, allStrLengths, clearStringTable } from './string-table';

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
	if (hasVNodeId(vnode)) {
		if (update(state, vnode, true, 0)) {
			resetChildren(state, vnode);
		}
	}
	else {
		// TODO: Unmount
		mount(state, vnode, true);
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
	if (!shouldFilter(vnode) && !hasVNodeId(vnode)) {
		mount(state, vnode, isRoot, parentId);
		shouldReset = true;
	}
	else {
		let children = getChildren(vnode);
		for (let i = 0; i < children.length; i++) {
			if (update(state, children[i], false, shouldFilter(vnode) ? parentId : getVNodeId(vnode))) {
				shouldReset = true;
			}
		}
	}

	if (shouldReset) {
		resetChildren(state, vnode);
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

	let stack = getChildren(vnode);
	let child;
	while ((child = stack.pop())!=null) {
		if (!shouldFilter(child)) {
			next.push(getVNodeId(child));
		}
		else {
			stack.push(...getChildren(child));
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
	let id = getVNodeId(vnode);

	if (isRoot) {
		state.pending.push([
			TREE_OPERATION_REMOVE,
			1, // Remove 1 item
			id
		]);
	}
	else if (!shouldFilter(vnode)) {
		state.pendingUnmountIds.push(id);
	}
	else {
		let children = getChildren(vnode);
		for (let i = 0; i < children.length; i++) {
			unmount(state, children[i], false);
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
	if (isRoot || !shouldFilter(vnode)) {
		id = getVNodeId(vnode);

		if (isRoot) {
			state.pending.push(
				TREE_OPERATION_ADD,
				id,
				ElementTypeRoot,
				1, // Flag to signal that the vnode supports profiling
				0 // We have no special owner meta data for roots
			);
		}
		else {
			let owner = vnode._component!=null && vnode._component._ancestorComponent!=null
				&& vnode._component._ancestorComponent._vnode!=null
				? getVNodeId(vnode._component._ancestorComponent._vnode)
				: 0;

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

	const children = getChildren(vnode);
	for (let i = 0; i < children.length; i++) {
		mount(state, children[i], false, !isRoot && shouldFilter(vnode) ? parentId : id);
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
		2 + // TREE_OPERATION_REMOVE + removed id length
		state.pendingUnmountIds.length +
		state.pending.length
	);

	let i = 0;
	ops[i++] = state.rendererId;
	ops[i++] = 1; // TODO

	// Add string table
	ops[i++] = allStrLengths;
	stringTable.forEach((_, k) => {
		ops[i++] = k.length;
		ops.set(encode(k), i);
		i += k.length;
	});

	// All unmounts
	ops[i++] = TREE_OPERATION_REMOVE;
	// Total number of unmount ids
	ops[i++] = state.pendingUnmountIds.length;
	for (let j = 0; j < state.pendingUnmountIds.length; j++) {
		ops[i + j] = state.pendingUnmountIds[j];
	}

	// Finally add all pending operations
	ops.set(state.pending, i);

	hook.emit('operations', ops);

	state.pending = [];
	state.pendingUnmountIds = [];
	clearStringTable();
}

/**
 * Whether the element should be visible in the devtools panel. Currently only
 * Components are shown.
 * @param {import('../internal').VNode} vnode
 */
export function shouldFilter(vnode) {
	return typeof vnode.type!=='function' || vnode.type===Fragment;
}

/**
 * Provide detailed information about the current vnode
 * @param {number} id
 * @returns {import('../internal').InspectData}
 */
export function inspectElement(id) {
	let vnode = getVNode(id);
	if (vnode==null) {
		throw new Error('Trying to inspect a vnode that was already unmounted. Please report this bug at: https://github.com/developit/preact/issues/new');
	}
	let hasHooks = vnode._component!=null && vnode._component.__hooks!=null;

	return {
		id,
		canEditHooks: hasHooks,
		canEditFunctionProps: true, // TODO
		canToggleSuspense: false, // TODO
		canViewSource: false, // TODO
		displayName: getDisplayName(vnode),
		// context: vnode._component ? cleanForBridge(vnode._component.context) : null, // TODO
		context: null, // TODO
		hooks: hasHooks ? cleanForBridge(inspectHooks(vnode)) : null,
		props: vnode.props!=null && Object.keys(vnode.props).length > 0
			? cleanForBridge(vnode.props)
			: null,
		state: hasHooks || vnode._component==null || !Object.keys(vnode._component.state).length
			? null
			: cleanForBridge(vnode._component.state),
		owners: null, // TODO
		source: null // TODO
	};
}

