import options from '../options';
import { Renderer } from './renderer';

/**
 * Wrap function with generic error logging
 *
 * @param {*} fn
 * @returns
 */
function catchErrors(fn) {
	return function(arg) {
		try {
			return fn(arg);
		}
		catch (e) {
			console.error('The react devtools encountered an error');
			console.log(e); // eslint-disable-line no-console
		}
	};
}

export function initDevTools() {
	// This global variable is injected by the devtools
	const hook = /** @type {import('../internal').DevtoolsWindow} */ (window).__REACT_DEVTOOLS_GLOBAL_HOOK__;
	if (hook==null) return;

	/** @type {(vnode: import('../internal').VNode) => void} */
	let onCommitRoot = (vnode) => {};

	/** @type {(vnode: import('../internal').VNode) => void} */
	let onCommitUnmount = (vnode) => {};

	// Initialize our custom renderer
	let rid = Math.random().toString(16).slice(2);
	let cevicheRenderer = new Renderer(hook, rid);

	catchErrors(() => {
		let isDev = false;
		try {
			isDev = process.env.NODE_ENV!=='production';
		}
		catch (e) {}

		// Tell devtools which bundle type we run in
		window.parent.postMessage({
			source: 'react-devtools-detector',
			reactBuildType: isDev ? 'development' : 'production'
		}, '*');

		let renderer = {
			bundleType: isDev ? 1 : 0,
			version: '16.5.2',
			rendererPackageName: 'preact',
			findHostInstanceByFiber(vnode) {
				return vnode._el;
			},
			findFiberByHostInstance(instance) {
				return cevicheRenderer.inst2vnode.get(instance) || null;
			}
		};

		hook._renderers[rid] = renderer;

		// We can't bring our own `attachRenderer` function therefore we simply
		// prevent the devtools from overwriting our custom renderer by creating
		// a noop setter.
		Object.defineProperty(hook.helpers, rid, {
			get: () => cevicheRenderer,
			set: () => helpers.markConnected()
		});

		let helpers = hook.helpers[rid];

		// Tell the devtools that we are ready to start
		hook.emit('renderer-attached', {
			id: rid,
			renderer,
			helpers
		});

		onCommitRoot = catchErrors(root => {
			let roots = hook.getFiberRoots(rid);

			// To enable profiling the devtools check if this property exists on
			// the given root node.
			root.treeBaseDuration = null;

			if (!roots.has(root)) roots.add(root);
			helpers.handleCommitFiberRoot(root);
		});

		onCommitUnmount = catchErrors(vnode => {
			hook.onCommitFiberUnmount(rid, vnode);
		});
	})();

	// The actual integration. There is no way to know weather the profiler is
	// actually recording or not. There is some discussion in this issue:
	// https://github.com/facebook/react-devtools/issues/1106
	options.enableProfiling = true;

	options.commitRoot = (vnode) => {
		onCommitRoot(vnode);
	};

	options.beforeUnmount = (vnode) => {
		onCommitUnmount(vnode);
	};
}
