import { _catchError } from './diff/catch-error';

export let vnodeHook;
export let unmountHook;
export let eventHook;
export let diffedHook;
export let diffHook;
export let debounceHook;
export let rootHook;
export let internalHook;
export let renderHook;
export let commitHook;
export let errorHook;

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

Object.defineProperty(options, 'vnode', {
	get() {
		return vnodeHook;
	},
	set(newHook) {
		vnodeHook = newHook;
	}
});

Object.defineProperty(options, 'unmount', {
	get() {
		return unmountHook;
	},
	set(newHook) {
		unmountHook = newHook;
	}
});

Object.defineProperty(options, 'diffed', {
	get() {
		return diffedHook;
	},
	set(newHook) {
		diffedHook = newHook;
	}
});

Object.defineProperty(options, 'event', {
	get() {
		return eventHook;
	},
	set(newHook) {
		eventHook = newHook;
	}
});

Object.defineProperty(options, 'debounceRendering', {
	get() {
		return debounceHook;
	},
	set(newHook) {
		debounceHook = newHook;
	}
});

Object.defineProperty(options, '_diff', {
	get() {
		return diffHook;
	},
	set(newHook) {
		diffHook = newHook;
	}
});

Object.defineProperty(options, '_internal', {
	get() {
		return internalHook;
	},
	set(newHook) {
		internalHook = newHook;
	}
});

Object.defineProperty(options, '_root', {
	get() {
		return rootHook;
	},
	set(newHook) {
		rootHook = newHook;
	}
});

Object.defineProperty(options, '_render', {
	get() {
		return renderHook;
	},
	set(newHook) {
		renderHook = newHook;
	}
});

Object.defineProperty(options, '_commit', {
	get() {
		return commitHook;
	},
	set(newHook) {
		commitHook = newHook;
	}
});

Object.defineProperty(options, '_catchError', {
	get() {
		return errorHook;
	},
	set(newHook) {
		errorHook = newHook;
	}
});
options._catchError = _catchError;

export default options;
