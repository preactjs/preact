import { updateComponentFilters } from './filter';
import { assign } from '../../../src/util';
import { findDomForVNode, selectElement, inspectElement, logElementToConsole, flushInitialEvents, onCommitFiberRoot, onCommitFiberUnmount } from './renderer';
import { startProfiling, getProfilingData, stopProfiling } from './profiling';
import { setInProps, setInState } from './update';
import { setInHook } from './hooks';

/**
 * Create an adapter instance for the devtools
 * @param {import('../internal').RendererConfigBase} config
 * @param {import('../internal').DevtoolsHook} hook
 */
export function createAdapter(config, hook) {

	/** @type {import('../internal').AdapterState} */
	let state = {
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
			byType: new Set(),
			byName: new Set(),
			byPath: new Set()
		}
	};

	const applyFilters = updateComponentFilters(hook, state);

	let renderer = assign(assign({}, config), {
		findNativeNodesForFiberID: findDomForVNode,
		startProfiling: () => startProfiling(hook, state, state.rendererId),
		stopProfiling: () => stopProfiling(state),
		getProfilingData: () => getProfilingData(state, state.rendererId),
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
		},
		flushInitialOperations: () => flushInitialEvents(hook, state),
		// TODO: Check if the following properties are still needed
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

	return {
		connect() {
			// Apply initial filters
			if (window.__REACT_DEVTOOLS_COMPONENT_FILTERS__) {
				applyFilters(window.__REACT_DEVTOOLS_COMPONENT_FILTERS__);
			}

			/** @type {import('../internal').DevtoolsWindow} */
			(window).__REACT_DEVTOOLS_ATTACH__ = (hook, id, renderer, target) => {
				state.rendererId = id;
				return renderer;
			};

			// Tell the devtools that we are ready to start
			hook.inject(renderer);
		},
		onCommitRoot: root => onCommitFiberRoot(hook, state, root),
		onCommitUnmount: vnode => onCommitFiberUnmount(hook, state, vnode)
	};
}
