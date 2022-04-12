import options from '../options';

/**
 * The full context storage object for the Internal currently being rendered.
 * @type {Record<string, any>}
 */
let currentContext = {};
export function getCurrentContext() {
	return currentContext;
}
export function setCurrentContext(context) {
	currentContext = context;
}

/**
 * A list of components with effects that need to be run at the end of the current render pass.
 * @type {import('../internal').CommitQueue}
 */
export let commitQueue = [];

/**
 * The parent DOM element for the Internal currently being rendered.
 * @type {import('../internal').DOMParent}
 */
let parentDom;
export function getCurrentParentDom() {
	return parentDom;
}
/** @param {import('../internal').DOMParent} newParentDom */
export function setCurrentParentDom(newParentDom) {
	parentDom = newParentDom;
}

/**
 * @param {import('../internal').Internal} rootInternal
 */
export function commitRoot(rootInternal) {
	let currentQueue = [].concat(commitQueue);
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
