import { options, Component } from 'preact';
import { onCommitFiberRoot, flushPendingEvents, inspectElement, onCommitFiberUnmount } from './renderer2';
import { setInProps, setInState } from './update';
import { assign } from '../../../src/util';
import { getVNode } from './cache';
import { setInHook } from './hooks';
import { now } from './util';
import { updateComponentFilters } from './filter';

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
			console.error(e); // eslint-disable-line no-console
		}
	};
}

/* istanbul ignore next */
let noop = () => undefined;

export function initDevTools() {
	// This global variable is injected by the devtools
	let hook =
		/** @type {import('../internal').DevtoolsWindow} */ (window).__REACT_DEVTOOLS_GLOBAL_HOOK__;

	if (hook==null || hook.isDisabled) return;

	/** @type {(vnode: import('../internal').VNode) => void} */
	let onCommitRoot = noop;

	/** @type {(vnode: import('../internal').VNode) => void} */
	let onCommitUnmount = noop;

	/** @type {number | null} */
	let rid = null;

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


		/** @type {import('../internal').AdapterState} */
		let state = {
			connected: false,
			currentRootId: -1,
			isProfiling: false,
			pending: [],
			pendingUnmountIds: [],
			pendingUnmountRootId: null,
			rendererId: -1,
			filter: {
				// TODO: Lazily initialize for IE11?
				byType: new Set(),
				byName: new Set(),
				byPath: new Set()
			}
		};

		const applyFilters = updateComponentFilters(hook, state);

		/** @type {import('../internal').RendererConfig} */
		let config = {
			bundleType: /* istanbul ignore next */  isDev ? 1 : 0,
			version: '16.8.4',
			rendererPackageName: 'preact',
			findNativeNodesForFiberID(id) {
				let vnode = getVNode(id);
				return vnode!=null ? vnode._dom : null;
			},
			startProfiling() {
				options._profiling = true;
			},
			stopProfiling() {
				options._profiling = false;
			},
			getProfilingData() {
				// TODO
				return {
					rendererId: rid,
					dataForRoots: []
				}
			},
			selectElement(id) {
				// TODO
			},
			cleanup() {
				// noop
			},
			inspectElement,
			updateComponentFilters: applyFilters
		};

		// Apply initial filters
		if (window.__REACT_DEVTOOLS_COMPONENT_FILTERS__) {
			applyFilters(window.__REACT_DEVTOOLS_COMPONENT_FILTERS__);
		}

		/** @type {import('../internal').DevtoolsWindow} */
		// eslint-disable-next-line arrow-body-style
		(window).__REACT_DEVTOOLS_ATTACH__ = (hook, id, renderer, target) => {
			state.rendererId = rid = id;
			return assign(config, {
				flushInitialOperations() {
					state.connected = true;

					if (state.pending.length > 0) {
						// TODO: Flush each root
						flushPendingEvents(hook, state);
					}

					state.pending = [];
				},
				setInProps,
				setInState,
				setInHook,

				/** @type {(vnode: import('../internal').VNode, path: Array<string | number>, value: any) => void} */
				overrideProps(vnode, path, value) {
					// TODO
				},
				setTrackedPath() {
					// TODO
				},
				getPathForElement() {
					// TODO
				},
				getBestMatchForTrackedPath() {
					// TODO
					return null;
				},
				currentDispatcherRef: { current: null }
			});
		};

		// Tell the devtools that we are ready to start
		hook.inject({
			renderer: config,
			reactBuildType: config.bundleType
		});

		// eslint-disable-next-line arrow-body-style
		onCommitRoot = catchErrors(root => {
			return onCommitFiberRoot(hook, state, root);
		});

		// eslint-disable-next-line arrow-body-style
		onCommitUnmount = catchErrors(vnode => {
			return onCommitFiberUnmount(hook, state, vnode);
		});
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
		if (options._profiling) vnode.startTime = now();
		if (prevBeforeDiff!=null) prevBeforeDiff(vnode);
	};

	options.diffed = (vnode) => {
		if (options._profiling) vnode.endTime = now();
		if (prevAfterDiff!=null) prevAfterDiff(vnode);
	};

	options._commit = catchErrors((vnode) => {
		// Call previously defined hook
		if (prevCommitRoot!=null) prevCommitRoot(vnode);

		// These cases are already handled by `unmount`
		if (vnode==null) return;

		if (rid!=null) {
			const roots = hook.getFiberRoots(rid);
			roots.add(vnode);
		}
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
