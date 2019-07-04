import { ElementTypeClass, ElementTypeFunction, ElementTypeMemo, ElementTypeForwardRef } from './constants';
import { getNearestDisplayName, getVNodeType } from './vnode';
import { getVNode } from './cache';
import { now } from './util';

/**
 * Start a profiling session
 * @param {import('../internal').DevtoolsHook} hook
 * @param {import('../internal').AdapterState} state
 */
export function startProfiling(hook, state) {
	if (state.isProfiling) return;

	state.isProfiling = true;
	state.profilingStart = now();
	// Copy durations, because it will be mutated during a profiling
	state.initialDurations = new Map(state.vnodeDurations);
}

/**
 * @param {import('../internal').AdapterState} state
 */
export function stopProfiling(state) {
	state.isProfiling = false;
}

/**
 * @param {import('../internal').AdapterState} state
 */
export function setupProfileData(state) {
	let rootId = state.currentRootId;
	if (!state.profilingData.has(rootId)) {
		state.profilingData.set(rootId, []);
	}

	state.currentProfilingData = {
		changed: new Map(),
		commitTime: performance.now() - state.profilingStart,
		timings: []
	};

	let data = state.profilingData.get(rootId);
	data.push(state.currentProfilingData);
}

/**
 * @param {number} rendererId
 * @param {import('../internal').AdapterState} state
 * @returns {import('../internal').ProfilingData}
 */
export function getProfilingData(state, rendererId) {

	/** @type {Array<import('../internal').ProfilingRootDataBackend>} */
	let data = [];

	// Loop over the profiling data for each root
	state.profilingData.forEach((profile, rootId) => {

		/** @type {Array<import('../internal').CommitDataBackend>} */
		let commitData = [];

		let fiberActualDurations = [];
		let fiberSelfDurations = [];
		let initialDurations = [];

		state.initialDurations.forEach((value, id) => {
			initialDurations.push([id, value]);
		});

		profile.forEach(commit => {
			let maxActualDuration = 0;

			let { timings, commitTime, changed } = commit;
			for (let i = 0; i < timings.length; i+=3) {
				let id = timings[i];
				fiberActualDurations.push([id, timings[i+1]]);
				fiberSelfDurations.push([id, Math.max(0, timings[i+2])]);

				if (timings[i+1] > maxActualDuration) {
					maxActualDuration = timings[i+1];
				}
			}

			// render reasons
			let changeDescriptions = [];
			changed.forEach((change, id) => {
				changeDescriptions.push([id, change]);
			});

			commitData.push({
				changeDescriptions,
				duration: maxActualDuration,
				fiberActualDurations,
				fiberSelfDurations,
				interactionIDs: [],
				priorityLevel: null,
				timestamp: commitTime
			});
		});

		data.push({
			commitData,
			displayName: getNearestDisplayName(getVNode(rootId)),
			initialTreeBaseDurations: initialDurations,
			interactionCommits: [],
			interactions: [],
			rootID: rootId
		});
	});

	return {
		rendererID: rendererId,
		dataForRoots: data
	};
}

/**
 * Get the reasons why a component rendered
 * @param {import('../internal').VNode} vnode
 * @returns {import('../internal').ChangeDescription | null}
 */
export function getChangeDescription(vnode) {
	let type = getVNodeType(vnode);

	switch (type) {
		case ElementTypeClass:
		case ElementTypeFunction:
		case ElementTypeMemo:
		case ElementTypeForwardRef: {
			let isNew = false;
			if (isNew) {
				return {
					context: null,
					didHooksChange: false,
					isFirstMount: true,
					props: null,
					state: null
				};
			}

			let c = vnode._component;
			return {
				context: getChangedKeys(c._context, c._prevContext)!=null,
				didHooksChange: c._prevHooksRevision!=c._currentHooksRevision,
				isFirstMount: false,
				props: getChangedKeys(c.props, c._prevProps),
				state: getChangedKeys(c.state, c._prevState)
			};
		}
		default:
			return null;
	}
}

/**
 * Check if two objecs changed
 * @param {object | null} a
 * @param {object | null} b
 * @returns {string[] | null}
 */
export function getChangedKeys(a, b) {
	if (a==null || b==null) return null;

	let changed = [];
	for (let i in b) if (a[i]!==b[i]) {
		changed.push(i);
	}

	return changed.length > 0 ? changed : null;
}
