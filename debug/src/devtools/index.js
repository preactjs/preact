import { options, Component } from 'preact';
import { onCommitFiberRoot, inspectElement, onCommitFiberUnmount, selectElement, logElementToConsole, flushInitialEvents } from './renderer';
import { setInProps, setInState } from './update';
import { assign } from '../../../src/util';
import { getVNode, hasVNodeId, getVNodeId } from './cache';
import { setInHook } from './hooks';
import { now, catchErrors } from './util';
import { updateComponentFilters } from './filter';
import { isRoot } from './vnode';
import { getProfilingData } from './profiling';

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

	/** @type {import('../internal').AdapterState} */
	let state;

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
		state = {
			connected: false,
			currentRootId: -1,
			isProfiling: false,
			profilingData: new Map(),
			currentCommitProfileData: [],
			vnodeDurations: new Map(),
			changeDescriptions: new Map(),
			profilingStart: 0,
			pending: [],
			pendingUnmountIds: [],
			pendingUnmountRootId: null,
			rendererId: -1,
			inspectedElementId: -1,
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
				// TODO: Check for siblings here?
				return vnode!=null ? [vnode._dom].filter(Boolean) : null;
			},
			startProfiling() {
				if (state.isProfiling) return;

				state.isProfiling = true;
				state.profilingStart = now();

				// Trigger a render to capture timings of all parent nodes. This is
				// needed so that we can display the correct bar length in the
				// flamegraph.
				hook.getFiberRoots(rid).forEach(root => {
					let id = getVNodeId(root);
					state.profilingData.set(id, []);
				});
			},
			stopProfiling() {
				state.isProfiling = false;
			},
			getProfilingData() {
				return getProfilingData(state, rid);
			},
			selectElement,
			cleanup() {
				// noop
			},
			inspectElement,
			updateComponentFilters: applyFilters,
			logElementToConsole,
			getOwnersList() {
				// TODO
				// eslint-disable-next-line no-console
				console.warn('TODO: getOwnersList() not implemented');
				return null;
			}
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
					flushInitialEvents(hook, state);
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
		onCommitRoot = root => {
			return onCommitFiberRoot(hook, state, root);
		};

		// eslint-disable-next-line arrow-body-style
		onCommitUnmount = vnode => {
			return onCommitFiberUnmount(hook, state, vnode);
		};
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
		if (state.isProfiling) vnode.startTime = now();
		if (prevBeforeDiff!=null) prevBeforeDiff(vnode);
	};

	options.diffed = (vnode, oldVNode) => {
		if (state.isProfiling) vnode.endTime = now();
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

		// Some libraries like mobx call `forceUpdate` inside `componentDidMount`.
		// This leads to an issue where `options.commit` is called twice, once
		// for the vnode where the update occured and once on the child vnode
		// somewhere down the tree where `forceUpdate` was called on. The latter
		// will be called first, but because the parents haven't been mounted
		// in the devtools this will lead to an incorrect result.
		// TODO: We should fix this in core instead of patching around it here
		if ((!isRoot(vnode) && !isRoot(vnode._parent)) && !hasVNodeId(vnode)) {
			return;
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
