import options from '../options';

export function addCommitCallback(internal, callback) {
	if (internal._commitCallbacks == null) {
		internal._commitCallbacks = [];
	}

	internal._commitCallbacks.push(callback);
}

/**
 * @param {Array<import('../internal').Component>} commitQueue List of components
 * which have callbacks to invoke in commitRoot
 * @param {import('../internal').Internal} rootInternal
 */
export function commitRoot(commitQueue, rootInternal) {
	if (options._commit) options._commit(rootInternal, commitQueue);

	commitQueue.some(c => {
		try {
			// @ts-ignore Reuse the commitQueue variable here so the type changes
			commitQueue = c._commitCallbacks;
			c._commitCallbacks = [];
			commitQueue.some(cb => {
				// @ts-ignore See above ts-ignore on commitQueue
				cb.call(c);
			});
		} catch (e) {
			options._catchError(e, c._internal);
		}
	});
}
