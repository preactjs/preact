import options from '../options';
import { applyRef } from './refs';

/**
 * A list of components with effects that need to be run at the end of the current render pass.
 * @type {import('../internal').CommitQueue}
 */
export let commitQueue = [];
export let refQueue = [];

/**
 * @param {import('../internal').Internal} rootInternal
 */
export function commitRoot(rootInternal) {
	let currentQueue = refQueue;
	refQueue = [];

	for (let i = 0; i < currentQueue.length; i++) {
		applyRef(
			currentQueue[i].ref,
			currentQueue[i]._component || currentQueue[i].data,
			currentQueue[i]
		);
	}

	currentQueue = commitQueue;
	commitQueue = [];

	if (options._commit) options._commit(rootInternal, currentQueue);

	currentQueue.some(internal => {
		try {
			// @ts-ignore Reuse the root variable here so the type changes
			currentQueue = internal.data._commitCallbacks.length;
			// @ts-ignore See above ts-ignore comment
			while (currentQueue--) {
				internal.data._commitCallbacks.shift()();
			}
		} catch (e) {
			options._catchError(e, internal);
		}
	});
}
