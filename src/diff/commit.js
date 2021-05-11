import options from '../options';
import { commitReactComponent } from './reactComponents';

/**
 * @param {import('../internal').CommitQueue} commitQueue List of components
 * which have callbacks to invoke in commitRoot
 * @param {import('../internal').Internal} rootInternal
 */
export function commitRoot(commitQueue, rootInternal) {
	if (options._commit) options._commit(rootInternal, commitQueue);

	commitQueue.some(internal => {
		try {
			commitReactComponent(internal);
		} catch (e) {
			options._catchError(e, internal);
		}
	});
}
