import { getVNodeId, getVNode, clearVNode, hasVNodeId, getPreviousChildrenIds, addChildToParent, removeChildFromParent } from './cache';
import { TREE_OPERATION_ADD, ElementTypeRoot, TREE_OPERATION_REMOVE, TREE_OPERATION_REORDER_CHILDREN, TREE_OPERATION_UPDATE_TREE_BASE_DURATION } from './constants';
import { getVNodeType, getDisplayName, getAncestor, getOwners, getRoot } from './vnode';
import { cleanForBridge } from './pretty';
import { inspectHooks } from './hooks';
import { encode } from './util';
import { getStringId, stringTable, allStrLengths, clearStringTable } from './string-table';
import { shouldFilter } from './filter';
import { isRoot, getInstance } from './custom';

/**
 * Called when a tree has completed rendering
 * @param {import('../internal').DevtoolsHook} hook
 * @param {import('../internal').AdapterState} state
 * @param {import('../internal').VNode} vnode
 */
export function onCommitFiberRoot(hook, state, vnode) {
	// Keep track of mounted roots
	let roots = hook.getFiberRoots(state.rendererId);
	let root;
	if (isRoot(vnode)) {
		roots.add(vnode);
		root = vnode;
	}
	else {
		root = getRoot(vnode);
	}

	// If we're seeing this node for the first time we need to be careful
	// not to set the id, otherwise the mount branch will not be chosen below
	if (hasVNodeId(root)) {
		state.currentRootId = getVNodeId(root);
	}

	if (state.isProfiling) {
		state.currentCommitProfileData = [];
	}

	// TODO: Profiling
	let parentId = 0;
	let ancestor = getAncestor(state.filter, vnode);
	if (ancestor!=null) {
		if (hasVNodeId(ancestor)) {
			parentId = getVNodeId(ancestor);
		}
	}

	if (hasVNodeId(vnode)) {
		update(state, vnode, parentId);
	}
	else {
		mount(state, vnode, parentId);
	}

	if (state.isProfiling) {
		if (state.profilingData.has(state.currentRootId)) {
			state.profilingData.get(state.currentRootId)
				.push(state.currentCommitProfileData);
		}
	}

	flushPendingEvents(hook, state);
	state.currentRootId = -1;
}

/**
 * Called when a vonde unmounts
 * @param {import('../internal').DevtoolsHook} hook
 * @param {import('../internal').AdapterState} state
 * @param {import('../internal').VNode} vnode
 */
export function onCommitFiberUnmount(hook, state, vnode) {
	// Check if is root
	if (!shouldFilter(state.filter, vnode)) {
		let ancestor = getAncestor(state.filter, vnode);
		if (ancestor && hasVNodeId(vnode) && hasVNodeId(ancestor)) {
			removeChildFromParent(getVNodeId(ancestor), getVNodeId(vnode));
		}
	}
	recordUnmount(state, vnode);
}

/**
 * @param {import('../internal').AdapterState} state
 * @param {import('../internal').VNode} vnode
 * @param {number} parentId
 * @returns {boolean}
 */
export function update(state, vnode, parentId) {
	let shouldReset = false;
	let include = !shouldFilter(state.filter, vnode);
	if (include && !hasVNodeId(vnode)) {
		mount(state, vnode, parentId);
		shouldReset = true;
	}
	else {
		let children = vnode._children || [];
		let prevChildren = getPreviousChildrenIds(vnode);

		for (let i = 0; i < children.length; i++) {
			if (children[i]!==null) {
				if (update(state, children[i], include ? getVNodeId(vnode) : parentId)) {
					shouldReset = true;
				}

				if (include && !shouldReset && hasVNodeId(children[i]) && prevChildren[i]!=getVNodeId(children[i])) {
					shouldReset = true;
				}
			}
		}
	}

	if (include) {
		recordProfiling(state, vnode, false);
	}

	if (shouldReset) {
		if (include) {
			if (vnode._children!=null && vnode._children.length > 0) {
				resetChildren(state, vnode);
			}
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
	if (!vnode._children) return;

	/** @type {number[]} */
	let next = [];

	let stack = vnode._children.slice();

	let child;
	while ((child = stack.pop())!=null) {
		if (!shouldFilter(state.filter, child)) {
			next.push(getVNodeId(child));
		}
		else if (child._children) {
			stack.push(...child._children);
		}
	}

	if (next.length < 2) return;

	state.pending.push(
		TREE_OPERATION_REORDER_CHILDREN,
		getVNodeId(vnode),
		next.length
	);

	next = next.reverse();
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

	recordUnmount(state, vnode);
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
		let id = getVNodeId(vnode);
		if (isRoot(vnode)) {
			state.pendingUnmountRootId = id;
		}
		else {
			state.pendingUnmountIds.push(id);
		}

		state.vnodeDurations.delete(id);
	}

	clearVNode(vnode);
}

/**
 * @param {import('../internal').AdapterState} state
 * @param {import('../internal').VNode} vnode
 * @param {number} parentId
 */
export function mount(state, vnode, parentId) {
	if (!shouldFilter(state.filter, vnode)) {
		let newId = getVNodeId(vnode);
		addChildToParent(parentId, newId);
		recordMount(state, vnode);

		// Our current vnode is the next parent from now on
		parentId = newId;
	}

	const children = vnode._children || [];
	for (let i = 0; i < children.length; i++) {
		if (children[i]!==null) {
			mount(state, children[i], parentId);
		}
	}
}

/**
 * @param {import('../internal').AdapterState} state
 * @param {import('../internal').VNode} vnode
 */
export function recordMount(state, vnode) {
	let id = getVNodeId(vnode);
	if (isRoot(vnode)) {
		state.pending.push(
			TREE_OPERATION_ADD,
			id,
			ElementTypeRoot,
			1,
			1
		);
		state.currentRootId = id;
	}
	else {
		let ancestor = getAncestor(state.filter, vnode);
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

	recordProfiling(state, vnode, true);
}

/**
 * Records profiling timings
 * @param {import('../internal').AdapterState} state
 * @param {import('../internal').VNode} vnode
 * @param {boolean} isNew
 */
export function recordProfiling(state, vnode, isNew) {
	let id = getVNodeId(vnode);
	let duration = vnode.endTime - vnode.startTime;
	state.vnodeDurations.set(id, duration > 0 ? duration : 10);

	if (!state.isProfiling) return;

	state.pending.push(
		TREE_OPERATION_UPDATE_TREE_BASE_DURATION,
		id,
		Math.floor(duration * 1000)
	);
	let selfDuration = duration;

	if (vnode._children) {
		for (let i = 0; i < vnode._children.length; i++) {
			let child = vnode._children[i];
			if (child) {
				selfDuration -= child.endTime - child.startTime;
			}
		}
	}

	state.currentCommitProfileData.push(
		id,
		duration,
		selfDuration // without children
	);
}

/**
 * Pass all pending operations to the devtools extension
 * @param {import('../internal').DevtoolsHook} hook
 * @param {import('../internal').AdapterState} state
 */
export function flushPendingEvents(hook, state) {
	if (
		state.pending.length==0 &&
		state.pendingUnmountIds.length==0 &&
		state.pendingUnmountRootId==null
	) {
		return;
	}

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
	ops[i++] = state.currentRootId;

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
		ops[i++] = state.pendingUnmountIds.length +
			(state.pendingUnmountRootId!=null ? 1 : 0);

		for (let j = 0; j < state.pendingUnmountIds.length; j++) {
			ops[i + j] = state.pendingUnmountIds[j];
		}
		i += state.pendingUnmountIds.length;
	}

	if (state.pendingUnmountRootId!==null) {
		ops[i++] = state.pendingUnmountRootId;
	}

	// Finally add all pending operations
	ops.set(state.pending, i);

	hook.emit('operations', ops);

	state.pending = [];
	state.pendingUnmountIds = [];
	clearStringTable();
}

/**
 * Flush initial buffered events as soon a the devtools successfully established
 * a connection
 * @param {import('../internal').DevtoolsHook} hook
 * @param {import('../internal').AdapterState} state
 */
export function flushInitialEvents(hook, state) {
	state.connected = true;

	// TODO: When operations are already queued, we should just flush the queus
	hook.getFiberRoots(state.rendererId).forEach(root => {
		state.currentRootId = getVNodeId(root);
		flushPendingEvents(hook, state);
	});
}

/**
 * Provide detailed information about the current vnode
 * @param {number} lastInspected
 * @returns {(id: number) => number | undefined | import('../internal').InspectData}
 */
export function inspectElement(lastInspected) {
	return id => {
		// Nothing has changed, so we bail out because `inspectElement` is
		// called in a loop :S
		if (id===lastInspected) return id;
		// FIXME: Find out why this function is called in a loop and what we can do
		// to prevent that.
		let vnode = getVNode(id);
		if (vnode==null) return;

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
	};
}

export function selectElement(id) {
	let vnode = getVNode(id);
	if (vnode==null) {
		console.warn(`vnode with id ${id} not found`);
		return;
	}

	if (typeof vnode.type=='function') {
		if (vnode.type.prototype && vnode.type.prototype.render) {

			/** @type {import('../internal').DevtoolsWindow} */
			(window).$r = getInstance(vnode);
			return;
		}

		/** @type {import('../internal').DevtoolsWindow} */
		(window).$r = {
			type: vnode.type,
			props: vnode.props
		};
		return;
	}

	/** @type {import('../internal').DevtoolsWindow} */
	(window).$r = null;
}

/**
 * Print an element to console
 * @param {number} id vnode id
 */
export function logElementToConsole(id) {
	let vnode = getVNode(id);
	if (vnode==null) {
		console.warn(`Could not find vnode with id ${id}`);
		return;
	}

	/* eslint-disable no-console */
	console.group(
		`LOG %c<${getDisplayName(vnode) || 'Component'} />`,
		// CSS Variable is injected by the devtools extension
		'color: var(--dom-tag-name-color); font-weight: normal'
	);
	console.log('props:', vnode.props);
	if (vnode._component) {
		console.log('state:', vnode._component.state);
	}
	console.log('vnode:', vnode);
	console.log('devtools id:', getVNodeId(vnode));
	console.groupEnd();
	/* eslint-enable no-console */
}
