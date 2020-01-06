/* istanbul ignore file */
import { options, Component, Fragment } from 'preact';
import { Renderer } from './renderer';
import { setupOptions } from './10/options';
import { createRenderer } from './10/renderer';

/**
 * Wrap function with generic error logging
 *
 * @param {*} fn
 * @returns
 */
function catchErrors(fn) {
	return function(...args) {
		try {
			return fn(...args);
		} catch (e) {
			/* istanbul ignore next */
			console.error('The react devtools encountered an error');
			/* istanbul ignore next */
			console.error(e); // eslint-disable-line no-console
		}
	};
}

/* istanbul ignore next */
let noop = () => undefined;

export function initDevTools() {
	// This global variable is injected by the devtools
	let preactHook = /** @type {*} */ (window).__PREACT_DEVTOOLS__;

	// Check for Preact devtools first :)
	if (preactHook) {
		const renderer = createRenderer(preactHook);
		setupOptions(/** @type {*} */ (options), renderer);
		preactHook.attach(renderer);
		return;
	}

	/** @type {import('../internal').DevtoolsWindow} */
	let hook = (window).__REACT_DEVTOOLS_GLOBAL_HOOK__;
	if (hook == null) return;

	/** @type {(vnode: import('../internal').VNode) => void} */
	let onCommitRoot = noop;

	/** @type {(vnode: import('../internal').VNode) => void} */
	let onCommitUnmount = noop;

	// Initialize our custom renderer
	let rid = Math.random()
		.toString(16)
		.slice(2);
	let preactRenderer = new Renderer(hook, rid);

	catchErrors(() => {
		let isDev = false;
		try {
			isDev = process.env.NODE_ENV !== 'production';
		} catch (e) {}

		// Tell devtools which bundle type we run in
		window.parent.postMessage(
			{
				source: 'react-devtools-detector',
				reactBuildType: /* istanbul ignore next */ isDev
					? 'development'
					: 'production'
			},
			'*'
		);

		let renderer = {
			bundleType: /* istanbul ignore next */ isDev ? 1 : 0,
			version: '16.5.2',
			rendererPackageName: 'preact',
			// We don't need this, but the devtools `attachRenderer` function relies on
			// it being there.
			findHostInstanceByFiber(vnode) {
				return vnode._dom;
			},
			// We don't need this, but the devtools `attachRenderer` function relies on
			// it being there.
			findFiberByHostInstance(instance) {
				return preactRenderer.inst2vnode.get(instance) || null;
			}
		};

		if (!hook._renderers) {
			// eslint-disable-next-line no-console
			console.info(
				'Preact is not compatible with your version of react-devtools. We ' +
					'will address this in future releases.'
			);
			return;
		}

		hook._renderers[rid] = renderer;

		// We can't bring our own `attachRenderer` function therefore we simply
		// prevent the devtools from overwriting our custom renderer by creating
		// a noop setter.
		Object.defineProperty(hook.helpers, rid, {
			get: () => preactRenderer,
			set: () => {
				if (!preactRenderer.connected) {
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
			// Empty root
			if (root.type === Fragment && root._children.length == 0) return;

			let roots = hook.getFiberRoots(rid);
			root = helpers.handleCommitFiberRoot(root);
			if (!roots.has(root)) roots.add(root);
		});

		onCommitUnmount = catchErrors(vnode => {
			hook.onCommitFiberUnmount(rid, vnode);
		});
	})();

	// Store (possible) previous hooks so that we don't overwrite them
	let prevVNodeHook = options.vnode;
	let prevCommitRoot = options._commit;
	let prevBeforeUnmount = options.unmount;
	let prevBeforeDiff = options._diff;
	let prevAfterDiff = options.diffed;

	options.vnode = vnode => {
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

	options._diff = vnode => {
		vnode.startTime = now();
		if (prevBeforeDiff != null) prevBeforeDiff(vnode);
	};

	options.diffed = vnode => {
		vnode.endTime = now();
		if (prevAfterDiff != null) prevAfterDiff(vnode);
	};

	options._commit = catchErrors((vnode, commitQueue) => {
		// Call previously defined hook
		if (prevCommitRoot != null) prevCommitRoot(vnode, commitQueue);

		// These cases are already handled by `unmount`
		if (vnode == null) return;
		onCommitRoot(vnode);
	});

	options.unmount = catchErrors(vnode => {
		// Call previously defined hook
		if (prevBeforeUnmount != null) prevBeforeUnmount(vnode);
		onCommitUnmount(vnode);
	});

	// Inject tracking into setState
	const setState = Component.prototype.setState;
	Component.prototype.setState = function(update, callback) {
		// Duplicated in setState() but doesn't matter due to the guard.
		let s =
			(this._nextState !== this.state && this._nextState) ||
			(this._nextState = Object.assign({}, this.state));

		// Needed in order to check if state has changed after the tree has been committed:
		this._prevState = Object.assign({}, s);

		return setState.call(this, update, callback);
	};
}

/**
 * Get current timestamp in ms. Used for profiling.
 * @returns {number}
 */
export let now = Date.now;

try {
	/* istanbul ignore else */
	now = performance.now.bind(performance);
} catch (e) {}
