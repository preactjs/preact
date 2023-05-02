import { _catchError } from './diff/catch-error';

/**
 * The `option` object can potentially contain callback functions
 * that are called during various stages of our renderer. This is the
 * foundation on which all our addons like `preact/debug`, `preact/compat`,
 * and `preact/hooks` are based on. See the `Options` type in `internal.d.ts`
 * for a full list of available option hooks (most editors/IDEs allow you to
 * ctrl+click or cmd+click on mac the type definition below).
 * @type {import('./internal').Options}
 */
const options = {};

/**
 * @template {keyof import('./internal').Options} T
 * @param {T} name
 * @param {any} [value] - initial value for the hook
 * @returns {import('./internal').Options[T]}
 */
function optionsHook(name, value) {
	Object.defineProperty(options, name, {
		get() {
			return value;
		},
		set(newValue) {
			value = newValue;
		}
	});
	return value;
}

export let vnodeHook = optionsHook('vnode');
export let unmountHook = optionsHook('unmount');
export let eventHook = optionsHook('event');
export let diffedHook = optionsHook('diffed');
export let debounceHook = optionsHook('debounceRendering');
export let diffHook = optionsHook('_diff');
export let rootHook = optionsHook('_root');
export let internalHook = optionsHook('_internal');
export let renderHook = optionsHook('_render');
export let commitHook = optionsHook('_commit');
export let errorHook = optionsHook('_catchError', _catchError);

export default options;
