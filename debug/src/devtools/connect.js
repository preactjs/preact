import { updateComponentFilters } from './filter';
import { assign } from '../../../src/util';
import { findDomForVNode, inspectElement, logElementToConsole, flushInitialEvents, onCommitFiberRoot, onCommitFiberUnmount } from './renderer';
import { startProfiling, getProfilingData, stopProfiling } from './profiling';
import { setInProps, setInState } from './update';
import { setInHook } from './hooks';
import { selectElement, getVNodePath, createSelectionStore } from './selection';

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

	let selections = createSelectionStore(state.filter, () => hook.getFiberRoots(state.rendererId));

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
		setTrackedPath: selections.setTrackedPath,
		getPathForElement: getVNodePath,
		getBestMatchForTrackedPath: selections.getBestMatch,
		currentDispatcherRef: { current: null }
	});

	return {
		renderer,
		connect() {
			// Apply initial filters
			if (window.__REACT_DEVTOOLS_COMPONENT_FILTERS__) {
				applyFilters(window.__REACT_DEVTOOLS_COMPONENT_FILTERS__);
			}

			let attach = (hook, id, renderer, target) => {
				state.rendererId = id;
				return renderer;
			};

			/** @type {import('../internal').DevtoolsWindow} */
			// TODO: The react-devtools declare this as non-configurable.
			// This prevents us from getting
			Object.defineProperty(window, '__REACT_DEVTOOLS_ATTACH__', {
				get: () => attach,
				configurable: true
			});

			// Tell the devtools that we are ready to start
			hook.inject(renderer);
		},
		onCommitRoot: root => onCommitFiberRoot(hook, state, root),
		onCommitUnmount: vnode => onCommitFiberUnmount(hook, state, vnode)
	};
}
