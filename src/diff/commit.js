import options from '../options';

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
			commitQueue = c._renderCallbacks;
			c._renderCallbacks = [];
			commitQueue.some(cb => {
				// @ts-ignore See above ts-ignore on commitQueue
				cb.call(c);
			});
		} catch (e) {
			options._catchError(e, c._vnode);
		}
	});
}
