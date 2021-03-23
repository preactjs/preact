import options from '../options';

/**
 * @param {import('../internal').Internal} internal
 * @param {() => void} callback
 */
export function addCommitCallback(internal, callback) {
	if (internal._commitCallbacks == null) {
		internal._commitCallbacks = [];
	}

	internal._commitCallbacks.push(callback);
}

/**
 * @param {import('../internal').CommitQueue} commitQueue List of components
 * which have callbacks to invoke in commitRoot
 * @param {import('../internal').Internal} rootInternal
 */
export function commitRoot(commitQueue, rootInternal) {
	if (options._commit) options._commit(rootInternal, commitQueue);

	commitQueue.some(internal => {
		try {
			// @ts-ignore Reuse the commitQueue variable here so the type changes
			commitQueue = internal._commitCallbacks;
			internal._commitCallbacks = [];
			commitQueue.some(cb => {
				cb();
			});
		} catch (e) {
			options._catchError(e, internal);
		}
	});
}
