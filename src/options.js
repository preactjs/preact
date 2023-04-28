import { _catchError } from './diff/catch-error';

export let vnodeHook;

/**
 * The `option` object can potentially contain callback functions
 * that are called during various stages of our renderer. This is the
 * foundation on which all our addons like `preact/debug`, `preact/compat`,
 * and `preact/hooks` are based on. See the `Options` type in `internal.d.ts`
 * for a full list of available option hooks (most editors/IDEs allow you to
 * ctrl+click or cmd+click on mac the type definition below).
 * @type {import('./internal').Options}
 */
const options = {
	_catchError
};

Object.defineProperty(options, 'vnode', {
	get() {
		return vnodeHook;
	},
	set(newHook) {
		if (newHook) {
			let oldHook = vnodeHook;
			vnodeHook = (vnode) => {
				newHook(vnode);
				if (oldHook) oldHook(vnode);
			};
		} else {
			vnodeHook = undefined;
		}
	}
});

export default options;
