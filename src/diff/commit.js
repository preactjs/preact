import options from '../options';

/**
 * The render queue
 * @type {import('../internal').RendererState}
 */
export const rendererState = {
	_parentDom: null,
	_context: {},
	_commitQueue: []
};

/**
 * @param {import('../internal').Internal} rootInternal
 */
export function commitRoot(rootInternal) {
	let commitQueue = [].concat(rendererState._commitQueue);
	rendererState._commitQueue = [];

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
