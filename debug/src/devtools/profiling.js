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

		state.vnodeDurations.forEach((value, id) => {
			initialDurations.push([id, value]);
		});

		profile.forEach(durations => {
			let maxActualDuration = 0;

			for (let i = 0; i < durations.length; i+=3) {
				let id = durations[i];
				fiberActualDurations.push([id, durations[i+1]]);
				fiberSelfDurations.push([id, durations[i+2]]);

				if (durations[i+1] > maxActualDuration) {
					maxActualDuration = durations[i+1];
				}
			}

			commitData.push({
				changeDescriptions: null,
				duration: maxActualDuration,
				fiberActualDurations,
				fiberSelfDurations,
				interactionIDs: [],
				priorityLevel: null,
				timestamp: performance.now() - state.profilingStart
			});
		});

		data.push({
			commitData,
			displayName: 'Unknown',
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
