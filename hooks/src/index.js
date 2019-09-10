import { options } from 'preact';

/** @type {number} */
let currentIndex;

/** @type {import('./internal').Component} */
let currentComponent;

/** @type {Array<import('./internal').Component>} */
let afterPaintEffects = [];

let oldBeforeRender = options._render;
options._render = vnode => {
	if (oldBeforeRender) oldBeforeRender(vnode);

	currentComponent = vnode._component;
	currentIndex = 0;

	if (currentComponent.__hooks) {
		currentComponent.__hooks._pendingEffects = handleEffects(currentComponent.__hooks._pendingEffects);
	}
};

let oldAfterDiff = options.diffed;
options.diffed = vnode => {
	if (oldAfterDiff) oldAfterDiff(vnode);

	const c = vnode._component;
	if (!c) return;

	const hooks = c.__hooks;
	if (hooks) {
		hooks._handles = bindHandles(hooks._handles);
		hooks._pendingLayoutEffects = handleEffects(hooks._pendingLayoutEffects);
	}
};


let oldBeforeUnmount = options.unmount;
options.unmount = vnode => {
	if (oldBeforeUnmount) oldBeforeUnmount(vnode);

	const c = vnode._component;
	if (!c) return;

	const hooks = c.__hooks;
	if (hooks) {
		hooks._list.forEach(hook => hook._cleanup && hook._cleanup());
	}
};

/**
 * Get a hook's state from the currentComponent
 * @param {number} index The index of the hook to get
 * @returns {import('./internal').HookState}
 */
function getHookState(index) {
	if (options._hook) options._hook(currentComponent);
	// Largely inspired by:
	// * https://github.com/michael-klein/funcy.js/blob/f6be73468e6ec46b0ff5aa3cc4c9baf72a29025a/src/hooks/core_hooks.mjs
	// * https://github.com/michael-klein/funcy.js/blob/650beaa58c43c33a74820a3c98b3c7079cf2e333/src/renderer.mjs
	// Other implementations to look at:
	// * https://codesandbox.io/s/mnox05qp8
	const hooks = currentComponent.__hooks || (currentComponent.__hooks = { _list: [], _pendingEffects: [], _pendingLayoutEffects: [], _handles: [] });

	if (index >= hooks._list.length) {
		hooks._list.push({});
	}
	return hooks._list[index];
}

export function useState(initialState) {
	return useReducer(invokeOrReturn, initialState);
}

export function useReducer(reducer, initialState, init) {

	/** @type {import('./internal').ReducerHookState} */
	const hookState = getHookState(currentIndex++);
	if (!hookState._component) {
		hookState._component = currentComponent;

		hookState._value = [
			!init ? invokeOrReturn(null, initialState) : init(initialState),

			action => {
				const nextValue = reducer(hookState._value[0], action);
				if (hookState._value[0]!==nextValue) {
					hookState._value[0] = nextValue;
					hookState._component.setState({});
				}
			}
		];
	}

	return hookState._value;
}

/**
 * @param {import('./internal').Effect} callback
 * @param {any[]} args
 */
export function useEffect(callback, args) {

	/** @type {import('./internal').EffectHookState} */
	const state = getHookState(currentIndex++);
	if (argsChanged(state._args, args)) {
		state._value = callback;
		state._args = args;

		currentComponent.__hooks._pendingEffects.push(state);
		afterPaint(currentComponent);
	}
}

/**
 * @param {import('./internal').Effect} callback
 * @param {any[]} args
 */
export function useLayoutEffect(callback, args) {

	/** @type {import('./internal').EffectHookState} */
	const state = getHookState(currentIndex++);
	if (argsChanged(state._args, args)) {
		state._value = callback;
		state._args = args;
		currentComponent.__hooks._pendingLayoutEffects.push(state);
	}
}

export function useRef(initialValue) {
	return useMemo(() => ({ current: initialValue }), []);
}

export function useImperativeHandle(ref, createHandle, args) {
	const state = getHookState(currentIndex++);
	if (argsChanged(state._args, args)) {
		state._args = args;
		currentComponent.__hooks._handles.push({ ref, createHandle });
	}
}

function bindHandles(handles) {
	handles.some(handle => {
		if (handle.ref) handle.ref.current = handle.createHandle();
	});
	return [];
}

/**
 * @param {() => any} callback
 * @param {any[]} args
 */
export function useMemo(callback, args) {

	/** @type {import('./internal').MemoHookState} */
	const state = getHookState(currentIndex++);
	if (argsChanged(state._args, args)) {
		state._args = args;
		state._callback = callback;
		return state._value = callback();
	}

	return state._value;
}

/**
 * @param {() => void} callback
 * @param {any[]} args
 */
export function useCallback(callback, args) {
	return useMemo(() => callback, args);
}

/**
 * @param {import('./internal').PreactContext} context
 */
export function useContext(context) {
	const provider = currentComponent.context[context._id];
	if (!provider) return context._defaultValue;
	const state = getHookState(currentIndex++);
	// This is probably not safe to convert to "!"
	if (state._value == null) {
		state._value = true;
		provider.sub(currentComponent);
	}
	return provider.props.value;
}

/**
 * Display a custom label for a custom hook for the devtools panel
 * @type {<T>(value: T, cb?: (value: T) => string | number) => void}
 */
export function useDebugValue(value, formatter) {
	if (options.useDebugValue) {
		options.useDebugValue(formatter ? formatter(value) : value);
	}
}

// Note: if someone used Component.debounce = requestAnimationFrame,
// then effects will ALWAYS run on the NEXT frame instead of the current one, incurring a ~16ms delay.
// Perhaps this is not such a big deal.
/**
 * Invoke a component's pending effects after the next frame renders
 * @type {(component: import('./internal').Component) => void}
 */
/* istanbul ignore next */
let afterPaint = () => {};

/**
 * After paint effects consumer.
 */
function flushAfterPaintEffects() {
	afterPaintEffects.some(component => {
		component._afterPaintQueued = false;
		if (component._parentDom) {
			component.__hooks._pendingEffects = handleEffects(component.__hooks._pendingEffects);
		}
	});
	afterPaintEffects = [];
}

const RAF_TIMEOUT = 100;

/**
 * requestAnimationFrame with a timeout in case it doesn't fire (for example if the browser tab is not visible)
 */
function safeRaf(callback) {
	const done = () => {
		clearTimeout(timeout);
		cancelAnimationFrame(raf);
		setTimeout(callback);
	};
	const timeout = setTimeout(done, RAF_TIMEOUT);
	const raf = requestAnimationFrame(done);
}

/* istanbul ignore else */
if (typeof window !== 'undefined') {
	let prevRaf = options.requestAnimationFrame;
	afterPaint = (component) => {
		if ((!component._afterPaintQueued && (component._afterPaintQueued = true) && afterPaintEffects.push(component) === 1) ||
		    prevRaf !== options.requestAnimationFrame) {
			prevRaf = options.requestAnimationFrame;

			/* istanbul ignore next */
			(options.requestAnimationFrame || safeRaf)(flushAfterPaintEffects);
		}
	};
}

function handleEffects(effects) {
	effects.forEach(invokeCleanup);
	effects.forEach(invokeEffect);
	return [];
}

function invokeCleanup(hook) {
	if (hook._cleanup) hook._cleanup();
}

/**
 * Invoke a Hook's effect
 * @param {import('./internal').EffectHookState} hook
 */
function invokeEffect(hook) {
	const result = hook._value();
	if (typeof result === 'function') hook._cleanup = result;
}

function argsChanged(oldArgs, newArgs) {
	return !oldArgs || newArgs.some((arg, index) => arg !== oldArgs[index]);
}

function invokeOrReturn(arg, f) {
	return typeof f === 'function' ? f(arg) : f;
}
