import options from '../options';

/**
 * @param {import('../internal').Internal} rootInternal
 * @param {import('../internal').CommitQueue} commitQueue List of components
 * which have callbacks to invoke in commitRoot
 */
export function commitRoot(rootInternal, commitQueue) {
	if (options._commit) options._commit(rootInternal, commitQueue);

	commitQueue.some(internal => {
		try {
			// @ts-ignore Reuse the root variable here so the type changes
			commitQueue = internal._commitCallbacks.length;
			// @ts-ignore See above ts-ignore comment
			while (commitQueue--) {
				internal._commitCallbacks.shift()();
			}
		} catch (e) {
			options._catchError(e, internal);
		}
	});
}
