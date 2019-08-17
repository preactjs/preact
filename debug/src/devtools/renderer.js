import { clearVNode } from './cache';
import { TREE_OPERATION_ADD, ElementTypeRoot, TREE_OPERATION_REMOVE, TREE_OPERATION_REORDER_CHILDREN, TREE_OPERATION_UPDATE_TREE_BASE_DURATION } from './constants';
import { getDevtoolsType, getDisplayName, getAncestor, getOwners, getRoot as findRoot, isRoot, getRenderedChildren, hasRenderedChildren, hasHookState, getComponentState, getVNodeProps, getComponentContext, getParent } from './vnode';
import { cleanForBridge, cleanContext } from './pretty';
import { inspectHooks } from './hooks';
import { shouldFilter } from './filter';
import { getChangeDescription } from './profiling';
import { flushTable, getStringId } from './string-table';

/**
 * Called when a tree has completed rendering
 * @param {() => Set<any>} getRoots
 * @param {import('./devtools').IdMapper} idMapper
 * @param {import('./devtools').Profiler} profiler
 * @param {(vnode: import('../internal').VNode, parentId: number) => void} mount
 * @param {(vnode: import('../internal').VNode, parentId: number) => void} update
 * @param {() => void} flush
 * @param {import('./devtools').AdapterState} state
 * @param {import('../internal').VNode} vnode
 */
export function onCommitFiberRoot(getRoots, idMapper, profiler, mount, update, flush, state, vnode) {
	// Some libraries like mobx call `forceUpdate` inside `componentDidMount`.
	// This leads to an issue where `options.commit` is called twice, once
	// for the vnode where the update occured and once on the child vnode
	// somewhere down the tree where `forceUpdate` was called on. The latter
	// will be called first, but because the parents haven't been mounted
	// in the devtools this will lead to an incorrect result.
	// TODO: We should fix this in core instead of patching around it here
	if ((!isRoot(vnode) && !isRoot(getParent(vnode))) && !idMapper.hasId(vnode)) {
		return;
	}

	const isNew = !idMapper.hasId(vnode);

	// Keep track of mounted roots
	let roots = getRoots();
	let root;
	if (isRoot(vnode)) {
		roots.add(vnode);
		root = vnode;
	}
	else {
		root = findRoot(vnode);
	}

	// If we're seeing this node for the first time we need to be careful
	// not to set the id, otherwise the mount branch will not be chosen below
	if (!idMapper.hasId(root)) {
		state.currentRootId = idMapper.getId(root);
	}

	if (profiler.state.running) {
		profiler.prepareCommit(state.currentRootId);
	}

	let parentId = 0;
	let ancestor = getAncestor(state.filter, vnode);
	if (ancestor!=null) {
		if (idMapper.hasId(ancestor)) {
			parentId = idMapper.getId(ancestor);
		}
	}

	if (isNew) {
		mount(vnode, parentId);
	}
	else {
		update(vnode, parentId);
	}

	flush();
	state.currentRootId = -1;
}

/**
 * Called when a vonde unmounts
 * @param {import('./devtools').IdMapper} idMapper
 * @param {import('./devtools').Linker} linker
 * @param {import('./devtools').RecordUnmount} recordUnmount
 * @param {import('./devtools').FilterState} filter
 * @returns {(vnode: import('../internal').VNode) => void}
 */
export const onCommitFiberUnmount = (idMapper, linker, recordUnmount, filter) => vnode => {
	if (!shouldFilter(filter, vnode)) {
		let ancestor = getAncestor(filter, vnode);
		if (ancestor && idMapper.hasId(vnode) && idMapper.hasId(ancestor)) {
			linker.unlink(idMapper.getId(ancestor), idMapper.getId(vnode));
		}
	}
	recordUnmount(vnode);
};

/**
 * @param {import('./devtools').AdapterState} state
 * @param {import('./devtools').IdMapper} idMapper
 * @param {import('./devtools').Linker} linker
 * @param {import('./devtools').Profiler} profiler
 * @param {(vnode: import('../internal').VNode, parentId: number) => void} mount
 * @returns {(vnode: import('../internal').VNode, parentId: number) => void} mount
 */
// eslint-disable-next-line arrow-body-style
export function updateTree(state, idMapper, linker, profiler, mount) {
	return function update(vnode, parentId) {
		let shouldReset = false;
		let include = !shouldFilter(state.filter, vnode);
		if (include && !idMapper.hasId(vnode)) {
			mount(vnode, parentId);
			shouldReset = true;
		}
		else {
			let children = getRenderedChildren(vnode);
			let prevChildren = linker.get(idMapper.getId(vnode));

			for (let i = 0; i < children.length; i++) {
				if (children[i]!==null) {
					if (update(children[i], include ? idMapper.getId(vnode) : parentId)) {
						shouldReset = true;
					}

					if (include && !shouldReset && idMapper.hasId(children[i]) && prevChildren[i]!=idMapper.getId(children[i])) {
						shouldReset = true;
					}
				}
			}
		}

		if (include) {
			recordProfiling(state, idMapper.getId(vnode), profiler, vnode);
		}

		if (shouldReset) {
			if (include) {
				if (hasRenderedChildren(vnode)) {
					resetChildren(state, idMapper, vnode);
				}
				return false;
			}

			return true;
		}

		return false;
	};
}

/**
 * Reset child ordering of a vnode
 * @param {import('./devtools').AdapterState} state
 * @param {import('./devtools').IdMapper} idMapper
 * @param {import('../internal').VNode} vnode
 */
export function resetChildren(state, idMapper, vnode) {
	if (!hasRenderedChildren(vnode)) return;

	/** @type {number[]} */
	let next = [];

	let stack = getRenderedChildren(vnode).slice();

	let child;
	while ((child = stack.pop())!=null) {
		if (!shouldFilter(state.filter, child)) {
			next.push(idMapper.getId(child));
		}
		else if (hasRenderedChildren(child)) {
			stack.push(...getRenderedChildren(child));
		}
	}

	if (next.length < 2) return;

	let ops = state.currentCommit.operations;
	ops.push(
		TREE_OPERATION_REORDER_CHILDREN,
		idMapper.getId(vnode),
		next.length
	);

	next = next.reverse();
	for (let i = 0; i < next.length; i++) {
		ops.push(next[i]);
	}
}

/**
 * @param {(vnode: import('../internal').VNode) => void} record
 * @param {import('../internal').VNode} vnode
 */
export function unmountTree(record, vnode) {
	let children = getRenderedChildren(vnode);
	for (let i = 0; i < children.length; i++) {
		if (children[i]!==null) {
			unmountTree(record, children[i]);
		}
	}

	record(vnode);
}

/**
 * Extracted unmount logic, because this will be called by
 * `handleCommitFiberUnmount` directly during rendering. For that reason
 * it should be as lightweight as possible to not taint profiling timings too
 * much.
 * @param {import('./devtools').AdapterState} state
 * @param {import('./devtools').IdMapper} idMapper
 * @param {import('./devtools').Linker} linker
 * @param {import('./devtools').Profiler} profiler
 * @returns {(vnode: import('../internal').VNode) => void}
 */
export const recordUnmount = (state, idMapper, linker, profiler) => vnode => {
	if (idMapper.hasId(vnode)) {
		let id = idMapper.getId(vnode);
		if (isRoot(vnode)) {
			state.currentCommit.unmountRootId = id;
		}
		else {
			state.currentCommit.unmountIds.push(id);
		}

		profiler.state.durations.delete(id);
	}

	clearVNode(idMapper, linker, vnode);
};

/**
 * @param {import('./devtools').AdapterState} state
 * @param {import('./devtools').IdMapper} idMapper
 * @param {import('./devtools').Linker} linker
 * @param {import('./devtools').Profiler} profiler
 * @returns {(vnode: import('../internal').VNode, parentId: number) => void} vnode
 */
// eslint-disable-next-line arrow-body-style
export const mountTree = (state, idMapper, linker, profiler) => {
	return function mount(vnode, parentId) {
		if (!shouldFilter(state.filter, vnode)) {
			let newId = idMapper.getId(vnode);
			linker.link(newId, parentId);
			recordMount(state, idMapper, profiler, vnode);

			// Our current vnode is the next parent from now on
			parentId = newId;
		}

		const children = getRenderedChildren(vnode);
		for (let i = 0; i < children.length; i++) {
			if (children[i]!==null) {
				mount(children[i], parentId);
			}
		}
	};
};

/**
 * @param {import('./devtools').AdapterState} state
 * @param {import('./devtools').IdMapper} idMapper
 * @param {import('./devtools').Profiler} profiler
 * @param {import('../internal').VNode} vnode
 */
export function recordMount(state, idMapper, profiler, vnode) {
	const { currentCommit, filter, stringTable } = state;
	let id = idMapper.getId(vnode);
	if (isRoot(vnode)) {
		state.currentCommit.operations.push(
			TREE_OPERATION_ADD,
			id,
			ElementTypeRoot,
			1, // supports profiling
			1 // has owner metadata
		);
		state.currentRootId = id;
	}
	else {
		let ancestor = getAncestor(filter, vnode);
		currentCommit.operations.push(
			TREE_OPERATION_ADD,
			id,
			getDevtoolsType(vnode),
			ancestor!=null ? idMapper.getId(ancestor) : 0,
			ancestor!=null && !isRoot(ancestor) ? idMapper.getId(ancestor) : 0,
			getStringId(stringTable, getDisplayName(vnode)),
			vnode.key ? getStringId(stringTable, vnode.key + '') : 0
		);
	}

	recordProfiling(state, idMapper.getId(vnode), profiler, vnode);
}

/**
 * Records profiling timings
 * @param {import('./devtools').AdapterState} state
 * @param {import('./devtools').Profiler} profiler
 * @param {import('../internal').VNode} vnode
 */
export function recordProfiling(state, id, profiler, vnode) {
	let duration = vnode.endTime - vnode.startTime;
	profiler.state.durations.set(id, duration > 0 ? duration : 0);

	if (!profiler.state.running) return;

	let commit = state.currentCommit;
	commit.operations.push(
		TREE_OPERATION_UPDATE_TREE_BASE_DURATION,
		id,
		Math.floor(duration * 1000)
	);
	let selfDuration = duration;

	if (hasRenderedChildren(vnode)) {
		const children = getRenderedChildren(vnode);
		for (let i = 0; i < children.length; i++) {
			let child = children[i];
			if (child) {
				let childDuration = child.endTime - child.startTime;
				selfDuration -= childDuration;
			}
		}

		// TODO: Why does this happen?
		if (selfDuration < 0) {
			selfDuration = 0;
		}
	}

	profiler.state.commit.timings.push(
		id,
		duration,
		selfDuration // without children
	);

	// "Why did this component render?" panel
	let changed = getChangeDescription(vnode);
	if (changed!=null) {
		profiler.state.commit.changed.set(id, changed);
	}
}

/**
 * Pass all pending operations to the devtools extension
 * @param {(data: number[]) => void} emit
 * @param {boolean} isProfiling
 * @param {import('./devtools').AdapterState} state
 * @param {number} rendererId
 */
export function flushPendingEvents(emit, isProfiling, state, rendererId) {
	const { stringTable, currentCommit } = state;
	let { unmountIds, unmountRootId, operations } = currentCommit;
	let numUnmounts = unmountIds.length + (unmountRootId===null ? 0 : 1);

	if (operations.length==0 && numUnmounts > 0 && !isProfiling) {
		return;
	}

	let msg = [
		rendererId,
		state.currentRootId,
		...flushTable(stringTable)
	];

	if (numUnmounts > 0) {
		msg.push(
			TREE_OPERATION_REMOVE,
			numUnmounts,
			...unmountIds
		);

		if (unmountRootId!==null) {
			msg.push(unmountRootId);
		}
	}

	msg.push(...operations);

	if (state.connected) {
		emit(msg);
	}
	else {
		state.pendingCommits.push(msg);
	}

	state.currentCommit = {
		operations: [],
		unmountIds: [],
		unmountRootId: null
	};
	stringTable.clear();
}

/**
 * Flush initial buffered events as soon a the devtools successfully established
 * a connection
 * @param {(data: number[]) => void} emit
 * @param {() => Set<any>} getRoots
 * @param {import('./devtools').IdMapper} idMapper
 * @param {import('./devtools').Profiler} profiler
 * @param {import('./devtools').AdapterState} state
 * @param {() => any} getRenderer
 * @param {Array<import('../internal').Filter>} filters
 * @param {(vnode: import('../internal').VNode, parentId: number) => void} mount
 * @param {() => void} flush
 */
export function flushInitialEvents(emit, getRoots, idMapper, profiler, state, getRenderer, filters, mount, flush) {
	state.connected = true;

	if (profiler.state.running) {
		profiler.prepareCommit(state.currentRootId);
	}

	// Flush any events we have queued up so far
	if (state.pendingCommits.length > 0) {
		state.pendingCommits.forEach(commit => {
			emit(commit);
		});
		state.pendingCommits = [];
	}
	else {
		getRoots().forEach(root => {
			state.currentRootId = idMapper.getId(root);
			mount(root, 0);
			flush();
		});
	}

	if (filters && state.filter.raw!==filters) {
		getRenderer().updateComponentFilters(state.filter.raw = filters);
	}

	state.currentRootId = -1;
}

/**
 * Find the DOM node for a vnode
 * @param {import('./devtools').IdMapper} idMapper
 * @param {number} id The id of the vnode
 * @returns {Array<import('../internal').PreactElement | HTMLElement | Text> | null}
 */
export function findDomForVNode(idMapper, id) {
	let vnode = idMapper.getVNode(id);
	// TODO: Check for siblings here?
	return vnode!=null ? [vnode._dom].filter(Boolean) : null;
}

/**
 * Provide detailed information about the current vnode
 * @param {import('./devtools').IdMapper} idMapper
 * @param {number} id vnode id
 * @returns {import('../internal').InspectData}
 */
export function inspectElementRaw(idMapper, id) {
	let vnode = idMapper.getVNode(id);
	let hasHooks = hasHookState(vnode);
	let owners = getOwners(idMapper, vnode);
	let state = getComponentState(vnode);
	let props = getVNodeProps(vnode);
	let context = getComponentContext(vnode);

	return {
		id,
		canEditHooks: hasHooks,
		canEditFunctionProps: true, // TODO
		canToggleSuspense: false, // TODO
		canViewSource: false, // TODO
		displayName: getDisplayName(vnode),
		type: getDevtoolsType(vnode),
		context: context!=null ? cleanContext(context) : null, // TODO
		events: null,
		hooks: hasHooks ? cleanForBridge(inspectHooks(vnode)) : null,
		props: props!=null ? cleanForBridge(props) : null,
		state: !hasHooks && state!=null ? cleanForBridge(state) : null,
		owners: owners.length ? owners : null,
		source: null // TODO
	};
}

// let lastInspected = -1;

/**
 * Inspect a vnode (the right panel in the devtools)
 * @param {import('./devtools').IdMapper} idMapper
 * @param {number} id The vnode id to inspect
 * @param {*} path TODO
 * @returns {import('../internal').InspectPayload}
 */
export function inspectElement(idMapper, id, path) {
	// Prevent infinite loop :/
	// TODO: Somehow this breaks the profiler
	// if (id==lastInspected) return;
	// lastInspected = id;

	if (idMapper.getVNode(id)==null) return;
	return {
		id,
		type: 'full-data',
		value: inspectElementRaw(idMapper, id)
	};
}
