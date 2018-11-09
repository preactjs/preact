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
			/* istanbul ignore next */
			console.error('The react devtools encountered an error');
			/* istanbul ignore next */
			console.log(e); // eslint-disable-line no-console
		}
	};
}

/* istanbul ignore next */
let noop = () => undefined;

export function initDevTools() {
	// This global variable is injected by the devtools
	let hook = /** @type {import('../internal').DevtoolsWindow} */ (window).__REACT_DEVTOOLS_GLOBAL_HOOK__;
	if (hook==null) return;

	/** @type {(vnode: import('../internal').VNode) => void} */
	let onCommitRoot = noop;

	/** @type {(vnode: import('../internal').VNode) => void} */
	let onCommitUnmount = noop;

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
			reactBuildType: /* istanbul ignore next */  isDev
				? 'development'
				: 'production'
		}, '*');

		let renderer = {
			bundleType: /* istanbul ignore next */  isDev ? 1 : 0,
			version: '16.5.2',
			rendererPackageName: 'preact',
			// We don't need this, but the devtools `attachRenderer` function relys
			// it being there.
			findHostInstanceByFiber(vnode) {
				return vnode._dom;
			},
			// We don't need this, but the devtools `attachRenderer` function relys
			// it being there.
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
			set: () => {
				if (!cevicheRenderer.connected) {
					helpers.markConnected();
				}
			}
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
			root = helpers.handleCommitFiberRoot(root);
			if (!roots.has(root)) roots.add(root);
		});

		onCommitUnmount = catchErrors(vnode => {
			hook.onCommitFiberUnmount(rid, vnode);
		});
	})();

	// Store (possible) previous hooks so that we don't overwrite them
	let prevCommitRoot = options.commitRoot;
	let prevBeforeUnmount = options.beforeUnmount;
	let prevBeforeDiff = options.beforeDiff;
	let prevAfterDiff = options.afterDiff;

	options.beforeDiff = (vnode) => {
		vnode.startTime = now();
		if (prevBeforeDiff!=null) prevBeforeDiff(vnode);
	};

	options.afterDiff = (vnode) => {
		vnode.endTime = now();
		if (prevAfterDiff!=null) prevAfterDiff(vnode);
	};

	options.commitRoot = catchErrors((vnode) => {
		// Call previously defined hook
		if (prevCommitRoot!=null) prevCommitRoot(vnode);

		// There are rare cases where this happens. I'm not sure why, but it seems
		// to be triggered by quickly switching routes in our demo app
		if (vnode==null || vnode._dom==null) return;
		onCommitRoot(vnode);
	});

	options.beforeUnmount = catchErrors((vnode) => {
		// Call previously defined hook
		if (prevBeforeUnmount!=null) prevBeforeUnmount(vnode);
		onCommitUnmount(vnode);
	});
}

/**
 * Get current timestamp in ms. Used for profiling.
 * @returns {number}
 */
export let now = Date.now;

try {
	/* istanbul ignore else */
	now = performance.now.bind(performance);
}
catch (e) {}
