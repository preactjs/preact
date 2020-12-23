import options from '../options';

/**
 * @param {Array<import('../internal').Component>} commitQueue List of components
 * which have callbacks to invoke in commitRoot
 * @param {import('../internal').VNode} root
 */
export function commitRoot(commitQueue, root) {
	if (options._commit) options._commit(root, commitQueue);

	commitQueue.some(c => {
		try {
			commitQueue = c._renderCallbacks;
			c._renderCallbacks = [];
			commitQueue.some(cb => {
				cb.call(c);
			});
		} catch (e) {
			options._catchError(e, c._vnode);
		}
	});
}
