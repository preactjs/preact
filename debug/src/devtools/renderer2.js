import { Fragment } from 'preact';
import { getVNodeId, getVNode } from './cache';
import { TREE_OPERATION_ADD, ElementTypeRoot, ElementTypeClass, ElementTypeFunction, ElementTypeOtherOrUnknown } from './constants';
import { getChildren, getDisplayName, setIn } from './custom';
import { cleanForBridge } from './pretty';
import { inspectHooks } from './hooks';

// TODO: Use a proper LRU cache?
/** @type {Map<string, Uint32Array>} */
let encoded = new Map();

// Hoisted for perf
const toCodePoint = s => s.codePointAt(0);

/**
 * Convert a string to an Uint32Array
 * @param {string} input
 * @returns {Uint32Array}
 */
export function utfEncode(input) {
	if (!encoded.has(input)) {
		encoded.set(input, Uint32Array.from(input, toCodePoint));
	}
	return encoded.get(input);
}

/**
 * Append an encoded string to an array
 * @param {number[]} arr
 * @param {Uint32Array} input
 */
export function append(arr, input) {
	arr[arr.length] = input.length;
	let len = arr.length;
	for (let i = 0; i < input.length; i++) {
		arr[len + i] = input[i];
	}
}

/**
 * @param {import('../internal').VNode} vnode
 */
export function getVNodeType(vnode) {
	if (typeof vnode.type=='function' && vnode.type!==Fragment) {
		// TODO: Memo and ForwardRef
		// TODO: Provider and Consumer
		return vnode.type.prototype && vnode.type.prototype.render
			? ElementTypeClass
			: ElementTypeFunction;
	}
	return ElementTypeOtherOrUnknown;
}

/**
 * Called when a tree has completed rendering
 * @param {import('../internal').DevtoolsHook} hook
 * @param {import('../internal').AdapterState} state
 * @param {import('../internal').VNode} vnode
 */
export function onCommitFiberRoot(hook, state, vnode) {
	// Empty root
	// if (root.type===Fragment && root._children.length==0) return;

	// TODO: Update
	// TODO: Unmount
	// TODO: Profiling
	mount(state, vnode, true);

	flushPendingEvents(hook, state);
	state.currentRootId = -1;
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
			let displayName = utfEncode(getDisplayName(vnode));

			let owner = vnode._component!=null && vnode._component._ancestorComponent!=null
				&& vnode._component._ancestorComponent._vnode!=null
				? getVNodeId(vnode._component._ancestorComponent._vnode)
				: 0;

			let next = [
				TREE_OPERATION_ADD,
				id,
				getVNodeType(vnode),
				parentId || 0,
				owner
			];

			append(next, displayName);

			if (vnode.key!=null) {
				append(next, utfEncode(vnode.key + ''));
			}
			else {
				next[next.length] = 0;
			}

			state.pending.push(...next);
		}
	}

	const children = getChildren(vnode);
	for (let i = 0; i < children.length; i++) {
		mount(state, children[i], false, id || parentId);
	}
}

/**
 * Pass all pending operations to the devtools extension
 * @param {import('../internal').DevtoolsHook} hook
 * @param {import('../internal').AdapterState} state
 */
export function flushPendingEvents(hook, state) {
	if (state.pending.length==0) return;

	// TODO: Profiling
	if (!state.connected) return;

	let rootRef = 1; // TODO
	state.pending.splice(0, 0, state.rendererId, rootRef);
	hook.emit('operations', Uint32Array.from(state.pending));
	state.pending = [];
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
	let hasHooks = vnode._component!=null && vnode._component.__hooks!=null;

	return {
		id,
		canEditHooks: false, // TODO
		canEditFunctionProps: false, // TODO
		canToggleSuspense: false, // TODO
		canViewSource: false, // TODO
		displayName: getDisplayName(vnode),
		// context: cleanForBridge({}), // TODO
		context: null, // TODO
		hooks: hasHooks ? inspectHooks(vnode) : null,
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

/**
 * Update a vnode's state
 * @param {number} id
 * @param {string[]} path
 * @param {*} value
 */
export function setInState(id, path, value) {
	let vnode = getVNode(id);
	if (vnode._component==null) {
		throw new Error(`Can't set state. Component ${getDisplayName(vnode)} is not a class`)
	}
	vnode._component.setState(prev => {
		setIn(prev, path, value);
		return prev;
	});
}

