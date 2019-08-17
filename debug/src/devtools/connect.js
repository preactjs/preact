/* istanbul ignore file */
import { updateComponentFilters, createFilterManager, loadRawFilters } from './filter';
import { assign } from '../../../src/util';
import { findDomForVNode, inspectElement, flushInitialEvents, onCommitFiberRoot, onCommitFiberUnmount, flushPendingEvents, mountTree, updateTree, recordUnmount, unmountTree as unmount } from './renderer';
import { getTimings, createProfiler } from './profiling';
import { setInProps, setInState } from './update';
import { setInHook } from './hooks';
import { selectElement, getVNodePath, createSelection } from './selection';
import { getOwners, logElementToConsole } from './vnode';
import { createIdMapper, createLinker } from './cache';

/**
 * Create an adapter instance for the devtools
 * @param {import('../internal').RendererConfigBase} config
 * @param {import('../internal').DevtoolsHook} hook
 */
export function createAdapter(config, hook) {

	/** @type {import('../internal').DevtoolsWindow} */
	let win = /** @type {*} */ (window);

	const profiler = createProfiler();
	const linker = createLinker();
	const idMapper = createIdMapper();

	/** @type {import('./devtools').AdapterState} */
	let state = {
		connected: false,
		currentRootId: -1,
		stringTable: new Map(),
		pendingCommits: [],
		currentCommit: {
			operations: [],
			unmountIds: [],
			unmountRootId: null
		},
		inspectedElementId: -1,
		filter: createFilterManager()
	};

	let rendererId = -1;

	// Construct Actions
	const getRoots = () => hook.getFiberRoots(rendererId);
	const emit = data => hook.emit('operations', data);
	const getRenderer = () => hook.renderers.get(rendererId);
	const flush = () => {
		flushPendingEvents(emit, profiler.state.running, state, rendererId);
	};

	const mount = mountTree(state, idMapper, linker, profiler);
	const update = updateTree(state, idMapper, linker, profiler, mount);
	const recordUnmount2 = recordUnmount(state, idMapper, linker, profiler);

	const applyFilters = updateComponentFilters(
		getRoots,
		state,
		idMapper,
		mount,
		unmount,
		recordUnmount2,
		flush
	);

	let selections = createSelection(idMapper, state.filter, getRoots);

	// Build our renderer
	const filters = win.__REACT_DEVTOOLS_COMPONENT_FILTERS__;
	let renderer = assign(assign({}, config), {
		findNativeNodesForFiberID: id => findDomForVNode(idMapper.getVNode(id)),
		startProfiling: profiler.start,
		stopProfiling: profiler.stop,
		getProfilingData: () =>  ({
			rendererID: rendererId,
			dataForRoots: getTimings(profiler, idMapper)
		}),
		selectElement: selectElement(idMapper.getVNode),
		cleanup() {
			// noop
		},
		inspectElement: (id, path) => inspectElement(idMapper, id, path),
		updateComponentFilters: applyFilters,
		logElementToConsole: id => logElementToConsole(idMapper.getVNode(id), id),
		getOwnersList: id => getOwners(idMapper, idMapper.getVNode(id)),
		flushInitialOperations: () => {
			flushInitialEvents(emit, getRoots, idMapper, profiler, state, getRenderer, filters, mount, flush);
		},
		setInProps: (id, path, value) => setInProps(idMapper.getVNode(id), path, value),
		setInState: (id, path, value) => setInState(idMapper.getVNode(id), path, value),
		setInHook: setInHook(idMapper.getVNode),

		/** @type {(vnode: import('../internal').VNode, path: Array<string | number>, value: any) => void} */
		overrideProps(vnode, path, value) {
			// TODO
		},
		setTrackedPath: selections.setTrackedPath,
		getPathForElement: getVNodePath(idMapper),
		getBestMatchForTrackedPath: selections.getBestMatch,
		currentDispatcherRef: { current: null }
	});

	return {
		renderer,
		connect() {
			let filters = loadRawFilters(win.__REACT_DEVTOOLS_COMPONENT_FILTERS__);

			if (filters.length > 0) {
				// Apply initial filters
				applyFilters(state.filter.raw = filters);
			}

			let attach = (hook, id, renderer, target) => {
				rendererId = id;
				return renderer;
			};

			Object.defineProperty(window, '__REACT_DEVTOOLS_ATTACH__', {
				get: () => attach,
				configurable: true
			});

			// Tell the devtools that we are ready to start
			hook.inject(renderer);
		},
		onCommitRoot: root => onCommitFiberRoot(getRoots, idMapper, profiler, mount, update, flush, state, root),
		onCommitUnmount: onCommitFiberUnmount(idMapper, linker, recordUnmount2, state.filter)
	};
}
