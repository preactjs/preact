
/**
 * @returns {{ hook: import('../../src/internal').DevtoolsHookMock, connect: () => void}}
 */
export function createMockDevtoolsHook() {
	let roots = new Set();
	let renderers = new Map();

	let hook = {
		emit: sinon.spy(),
		isDisabled: false,
		getFiberRoots() { return roots; },
		inject: sinon.spy(options => {
			renderers.set(1, options.renderer);
		}),
		renderers,
		on() {},
		onCommitFiberRoot() {},
		onCommitFiberUnmount() {}
	};

	function connect() {
		let attached = /** @type {*} */ (window).__REACT_DEVTOOLS_ATTACH__(hook, 1, renderers.get(1), window);
		attached.flushInitialOperations();
	}

	/** @type {*} */
	(window).__REACT_DEVTOOLS_GLOBAL_HOOK__ = hook;

	return { hook, connect };
}

export function convertEmit(args) {
	if (args.length > 2) {
		throw new Error('Invalid arguments passed to hook.emit()');
	}
	if (args[0]!='operations') {
		throw new Error('Event type must be "operations"');
	}
	return Array.from(args[1]);
}
