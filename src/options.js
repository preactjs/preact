import { UNDEFINED } from './constants';
import { _catchError } from './diff/catch-error';

export let vnodeOptionsHook = vnode => {
	// If a Component VNode, check for and apply defaultProps
	// Note: type may be undefined in development, must never error here.
	if (typeof vnode.type == 'function' && vnode.type.defaultProps != null) {
		for (const i in vnode.type.defaultProps) {
			if (vnode.props[i] === UNDEFINED) {
				vnode.props[i] = vnode.type.defaultProps[i];
			}
		}
	}
};
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
		return vnodeOptionsHook;
	},
	set(value) {
		vnodeOptionsHook = value;
	}
});

export default options;
