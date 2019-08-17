import { ElementTypeClass, ElementTypeFunction, ElementTypeMemo, ElementTypeForwardRef } from './constants';
import { getNearestDisplayName, getDevtoolsType } from './vnode';
import { now } from './util';

/**
 * @returns {import('./devtools').Profiler}
 */
export function createProfiler() {
	const state = {
		running: false,
		startTime: NaN,
		initial: new Map(),
		durations: new Map(),
		commit: null,
		data: new Map()
	};

	const start = () => {
		if (!state.running) {
			state.running = true;
			state.startTime = now();
			// Copy durations, because it will be mutated during a profiling session
			state.initial = new Map(state.durations);
		}
	};
	const stop = () => state.running = false;

	const prepareCommit = (rootId) => {
		state.commit = {
			changed: new Map(),
			commitTime: now() - state.startTime,
			timings: []
		};

		if (!state.data.has(rootId)) state.data.set(rootId, []);
		state.data.get(rootId).push(state.commit);
	};

	return { start, stop, state, prepareCommit };
}

/**
 * Collect all profiler timings and transform them to something the devtools
 * can understand.
 * @param {import('./devtools').Profiler} profiler
 * @param {import('./devtools').IdMapper} mapper
 * @returns {import('../internal').ProfilingData["dataForRoots"]}
 */
export function getTimings(profiler, mapper) {

	/** @type {Array<import('../internal').ProfilingRootDataBackend>} */
	let data = [];

	const { state } = profiler;

	// Loop over the profiling data for each root
	state.data.forEach((profile, rootId) => {

		/** @type {Array<import('../internal').CommitDataBackend>} */
		let commitData = [];

		let fiberActualDurations = [];
		let fiberSelfDurations = [];
		let initial = [];

		state.initial.forEach((value, id) => {
			initial.push([id, value]);
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
			displayName: getNearestDisplayName(mapper.getVNode(rootId)),
			initialTreeBaseDurations: initial,
			interactionCommits: [],
			interactions: [],
			rootID: rootId
		});
	});

	return data;
}

/**
 * Get the reasons why a component rendered
 * @param {import('../internal').VNode} vnode
 * @returns {import('../internal').ChangeDescription | null}
 */
export function getChangeDescription(vnode) {
	let type = getDevtoolsType(vnode);

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
