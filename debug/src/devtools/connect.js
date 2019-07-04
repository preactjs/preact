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

	/** @type {import('../internal').DevtoolsWindow} */
	let win = /** @type {*} */ (window);

	/** @type {import('../internal').AdapterState} */
	let state = {
		connected: false,
		currentRootId: -1,
		isProfiling: false,
		profilingData: new Map(),
		vnodeDurations: new Map(),
		changeDescriptions: new Map(),
		profilingStart: 0,
		pendingCommits: [],
		currentCommit: {
			timings: [],
			operations: [],
			unmountIds: [],
			unmountRootId: null
		},
		rendererId: -1,
		inspectedElementId: -1,
		filter: {
			raw: [],
			byType: new Set(),
			byName: new Set(),
			byPath: new Set()
		}
	};

	const applyFilters = updateComponentFilters(hook, state);

	let selections = createSelectionStore(state.filter, () => hook.getFiberRoots(state.rendererId));

	let renderer = assign(assign({}, config), {
		findNativeNodesForFiberID: findDomForVNode,
		startProfiling: () => startProfiling(hook, state),
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
		flushInitialOperations: () => flushInitialEvents(hook, state, win.__REACT_DEVTOOLS_COMPONENT_FILTERS__),
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
			if (win.__REACT_DEVTOOLS_COMPONENT_FILTERS__) {
				applyFilters(state.filter.raw = win.__REACT_DEVTOOLS_COMPONENT_FILTERS__);
			}

			let attach = (hook, id, renderer, target) => {
				state.rendererId = id;
				return renderer;
			};

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
