import { options, Component } from 'preact';
import { now, catchErrors, getDevtoolsVersion } from './util';
import { createAdapter } from './connect';
import { createLegacyAdapter } from './legacy/connect';
import { SESSION_STORAGE_RELOAD_AND_PROFILE_KEY } from './constants';

let noop = () => null;

export function initDevTools() {

	/** @type {import('../internal').DevtoolsWindow} */
	let win = /** @type {*} */ (window);

	// This global variable is injected by the devtools
	let hook = win.__REACT_DEVTOOLS_GLOBAL_HOOK__;

	if (hook==null || hook.isDisabled) return;

	/** @type {(vnode: import('../internal').VNode) => void} */
	let onCommitRoot = noop;

	/** @type {(vnode: import('../internal').VNode) => void} */
	let onCommitUnmount = noop;

	catchErrors(() => {
		let isDev = false;
		try {
			isDev = process.env.NODE_ENV!=='production';
		}
		catch (e) {}

		// Tell devtools which bundle type we run in
		window.parent.postMessage({
			source: 'react-devtools-detector',
			reactBuildType: /* istanbul ignore next */  isDev
				? 'development'
				: 'production'
		}, '*');

		/** @type {import('../internal').RendererConfigBase} */
		let config = {
			bundleType: /* istanbul ignore next */  isDev ? 1 : 0,
			version: '16.8.4',
			rendererPackageName: 'preact'
		};

		let version = getDevtoolsVersion(win);
		let adapter;
		switch (version) {
			case 4:
				adapter = createAdapter(config, /** @type {*} */ (hook));

				// Necessary for "reload-and-profile" feature
				if (window.sessionStorage.getItem(SESSION_STORAGE_RELOAD_AND_PROFILE_KEY)==='true') {
					adapter.renderer.startProfiling();
				}
				break;
			case 3: {
				adapter = createLegacyAdapter(config, /** @type {*} */ (hook));
				break;
			}
			default:
				throw new Error(`No adapter found for devtools version: ${version}`);
		}

		onCommitRoot = root => adapter.onCommitRoot(root);
		onCommitUnmount = vnode => adapter.onCommitUnmount(vnode);

		adapter.connect();
	})();

	// Store (possible) previous hooks so that we don't overwrite them
	let prevVNodeHook = options.vnode;
	let prevCommitRoot = options._commit;
	let prevBeforeUnmount = options.unmount;
	let prevBeforeDiff = options._diff;
	let prevAfterDiff = options.diffed;

	options.vnode = (vnode) => {
		// Tiny performance improvement by initializing fields as doubles
		// from the start. `performance.now()` will always return a double.
		// See https://github.com/facebook/react/issues/14365
		// and https://slidr.io/bmeurer/javascript-engine-fundamentals-the-good-the-bad-and-the-ugly
		vnode.startTime = NaN;
		vnode.endTime = NaN;

		vnode.startTime = 0;
		vnode.endTime = -1;
		if (prevVNodeHook) prevVNodeHook(vnode);
	};

	options._diff = (vnode) => {
		vnode.startTime = now();
		if (prevBeforeDiff!=null) prevBeforeDiff(vnode);
	};

	options.diffed = (vnode, oldVNode) => {
		vnode.endTime = now();
		if (vnode!=null && vnode._component!=null && oldVNode!=null && oldVNode._component!=null) {
			let c = vnode._component;
			c._prevProps = oldVNode.props;
			c._prevContext = oldVNode._component._context;
			c._prevHooks = oldVNode._component.__hooks._list;
		}
		if (prevAfterDiff!=null) prevAfterDiff(vnode);
	};

	options._commit = catchErrors((vnode) => {
		// Call previously defined hook
		if (prevCommitRoot!=null) prevCommitRoot(vnode);

		// These cases are already handled by `unmount`
		if (vnode==null) return;
		onCommitRoot(vnode);
	});

	options.unmount = catchErrors((vnode) => {
		// Call previously defined hook
		if (prevBeforeUnmount!=null) prevBeforeUnmount(vnode);
		onCommitUnmount(vnode);
	});

	// Inject tracking into setState
	const setState = Component.prototype.setState;
	Component.prototype.setState = function(update, callback) {
		// Duplicated in setState() but doesn't matter due to the guard.
		let s = (this._nextState!==this.state && this._nextState) || (this._nextState = Object.assign({}, this.state));

		// Needed in order to check if state has changed after the tree has been committed:
		this._prevState = Object.assign({}, s);

		return setState.call(this, update, callback);
	};

	// Teardown devtools options. Mainly used for testing
	return () => {
		options.unmount = prevBeforeUnmount;
		options._commit = prevCommitRoot;
		options.diffed = prevAfterDiff;
		options._diff = prevBeforeDiff;
		options.vnode = prevVNodeHook;
	};
}
