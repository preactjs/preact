import options from '../options';

/**
 * A list of components with effects that need to be run at the end of the current render pass.
 * @type {import('../internal').CommitQueue}
 */
export let commitQueue = [];

/**
 * @param {import('../internal').Internal} rootInternal
 */
export function commitRoot(rootInternal) {
	let currentQueue = commitQueue;
	commitQueue = [];

	if (options._commit) options._commit(rootInternal, currentQueue);

	currentQueue.some(internal => {
		try {
			// @ts-ignore Reuse the root variable here so the type changes
			currentQueue = internal._commitCallbacks.length;
			// @ts-ignore See above ts-ignore comment
			while (currentQueue--) {
				internal._commitCallbacks.shift()();
			}
		} catch (e) {
			options._catchError(e, internal);
		}
	});
}
