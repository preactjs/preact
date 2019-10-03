import options from './options';
import { handleEffects } from './diff';
import { enqueueRender } from './component';

export const globalHookState = {
	currentComponent: null,
	currentIndex: null,
	afterPaintEffects: [],
	effects: []
};

/**
 * Get a hook's state from the currentComponent
 * @param {number} index The index of the hook to get
 * @returns {import('./internal').HookState}
 */
function getHookState(index) {
	const { currentComponent } = globalHookState;
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


export function useReducer(reducer, initialState, init) {

	/** @type {import('./internal').ReducerHookState} */
	const hookState = getHookState(globalHookState.currentIndex++);
	if (!hookState._component) {
		hookState._component = globalHookState.currentComponent;

		hookState._value = [
			!init ? invokeOrReturn(undefined, initialState) : init(initialState),

			action => {
				const nextValue = reducer(hookState._value[0], action);
				if (hookState._value[0]!==nextValue) {
					hookState._value[0] = nextValue;
					enqueueRender(hookState._component);
				}
			}
		];
	}

	return hookState._value;
}

export const useState = useReducer.bind(undefined, invokeOrReturn);

/**
 * @param {import('./internal').Effect} callback
 * @param {any[]} args
 */
export function useEffect(callback, args) {
	const { currentComponent } = globalHookState;

	/** @type {import('./internal').EffectHookState} */
	const state = getHookState(globalHookState.currentIndex++);
	if (argsChanged(state._args, args)) {
		state._value = callback;
		state._args = args;

		currentComponent.__hooks._pendingEffects.push(state);
		globalHookState.effects.push(currentComponent);
	}
}

/**
 * @param {import('./internal').Effect} callback
 * @param {any[]} args
 */
export function useLayoutEffect(callback, args) {
	const { currentComponent } = globalHookState;

	/** @type {import('./internal').EffectHookState} */
	const state = getHookState(globalHookState.currentIndex++);
	if (argsChanged(state._args, args)) {
		state._value = callback;
		state._args = args;
		currentComponent.__hooks._pendingLayoutEffects.push(state);
		globalHookState.effects.push(currentComponent);
	}
}

export function useRef(initialValue) {
	return useMemo(() => ({ current: initialValue }), []);
}

export function useImperativeHandle(ref, createHandle, args) {
	let { _args } = getHookState(globalHookState.currentIndex++);
	if (argsChanged(_args, args)) {
		_args = args;
		globalHookState.currentComponent.__hooks._handles.push({ ref, createHandle });
	}
}

/**
 * @param {() => any} callback
 * @param {any[]} args
 */
export function useMemo(callback, args) {

	/** @type {import('./internal').MemoHookState} */
	const state = getHookState(globalHookState.currentIndex++);
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
	const provider = globalHookState.currentComponent.context[context._id];
	if (!provider) return context._defaultValue;
	let { _value } = getHookState(globalHookState.currentIndex++);
	// This is probably not safe to convert to "!"
	if (_value == null) {
		_value = true;
		provider.sub(globalHookState.currentComponent);
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
export let afterPaint = () => {};

/**
 * After paint effects consumer.
 */
function flushAfterPaintEffects(component) {
	component._afterPaintQueued = false;
	if (component._parentDom) {
		component.__hooks._pendingEffects = handleEffects(component.__hooks._pendingEffects);
	}
}

/**
 * requestAnimationFrame with a timeout in case it doesn't fire (for example if the browser tab is not visible)
 */
function safeRaf(callback) {
	const done = () => {
		clearTimeout(timeout);
		cancelAnimationFrame(raf);
		setTimeout(callback);
	};
	const timeout = setTimeout(done, 100);
	const raf = requestAnimationFrame(done);
}

/* istanbul ignore else */
if (typeof window !== 'undefined') {
	let prevRaf = options.requestAnimationFrame;
	afterPaint = (c) => {
		if ((!c._afterPaintQueued && (c._afterPaintQueued = true)) || prevRaf !== options.requestAnimationFrame) {
			prevRaf = options.requestAnimationFrame;
			/* istanbul ignore next */
			(options.requestAnimationFrame || safeRaf)(() => flushAfterPaintEffects(c));
		}
	};
}

function argsChanged(oldArgs, newArgs) {
	return !oldArgs || newArgs.some((arg, index) => arg !== oldArgs[index]);
}

function invokeOrReturn(arg, f) {
	return typeof f === 'function' ? f(arg) : f;
}
