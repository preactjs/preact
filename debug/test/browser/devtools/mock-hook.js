/**
 * @returns {import('../../../src/internal').DevtoolsMock}
 */
export function createMockDevtoolsHook() {
	let roots = new Set();

	/** @type {Map<number, import('../../../src/internal').Renderer>} */
	let renderers = new Map();

	/** @type {import('../../../src/internal').DevtoolsWindow} */
	let win = /** @type {*} */ (window);

	let hook = {
		emit: sinon.spy(),
		isDisabled: false,
		getFiberRoots() { return roots; },
		inject: sinon.spy(renderer => {
			renderers.set(1, renderer);
		}),
		renderers,
		rendererInterfaces: {},
		on() {},
		onCommitFiberRoot() {},
		onCommitFiberUnmount() {},
		flushInitialOperations: sinon.spy()
	};

	function applyFilters(filters) {
		return renderers.get(1).updateComponentFilters(filters);
	}

	function connect() {
		win.__REACT_DEVTOOLS_GLOBAL_HOOK__ = hook;

		let attached = win.__REACT_DEVTOOLS_ATTACH__(hook, 1, renderers.get(1), window);
		attached.flushInitialOperations();
	}

	function inspect(id) {
		return renderers.get(1).inspectElement(id);
	}

	function setState(id, path, value) {
		return renderers.get(1).setInState(id, path, value);
	}

	win.__REACT_DEVTOOLS_GLOBAL_HOOK__ = hook;
	win.__REACT_DEVTOOLS_COMPONENT_FILTERS__ = [
		{ isEnabled: true, type: 1, value: 7 }
	];

	return { hook, connect, inspect, setState, applyFilters };
}

export function parseEmit(args) {
	if (args.length > 2) {
		throw new Error('Invalid arguments passed to hook.emit()');
	}
	if (args[0]!='operations') {
		throw new Error('Event type must be "operations"');
	}
	return Array.from(args[1]);
}

/**
 * @returns {import('../../../src/internal').LegacyMockHook}
 */
export function createLegacyMockHook() {
	let roots = new Set();

	/** @type {Array<import('../../../src/internal').DevtoolsEvent>} */
	let events = [];

	function emit(ev, data) {
		if (ev=='renderer-attached') return;
		events.push(data);
	}

	function getFiberRoots() {
		return roots;
	}

	function clear() {
		roots.clear();
		events.length = 0;
	}

	function clearEvents() {
		events.length = 0;
	}

	let helpers = {};

	return {
		on() {},
		inject() { return 'abc'; },
		onCommitFiberRoot() {},
		onCommitFiberUnmount(rid, vnode) {
			if (helpers[rid]!=null) {
				helpers[rid].handleCommitFiberUnmount(vnode);
			}
		},
		_roots: roots,
		log: events,
		_renderers: {},
		helpers,
		clear,
		clearEvents,
		getFiberRoots,
		emit
	};
}
