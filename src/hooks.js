import options from './options';
import { enqueueRender } from './component';

let currentComponent = null;
let currentIndex = null;
let afterPaintEffects = [];

export function resetHookState(c) {
	currentComponent = c;
	currentIndex = 0;
}

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
	const hooks = currentComponent.__hooks || (currentComponent.__hooks = { _list: [], _pendingEffects: [], _pendingLayoutEffects: [] });

	if (index >= hooks._list.length) {
		hooks._list.push({});
	}
	return hooks._list[index];
}


/**
 * @param {import('./index').Reducer<any, any>} reducer
 * @param {import('./index').StateUpdater<any>} initialState
 * @param {(initialState: any) => void} init
 * @returns {[ any, (state: any) => void ]}
 */
export function useReducer(reducer, initialState, init) {

	/** @type {import('./internal').ReducerHookState} */
	const hookState = getHookState(currentIndex++);
	if (!hookState._component) {
		hookState._component = currentComponent;

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

/** @type {typeof import('./index').useState} */
export const useState = useReducer.bind(undefined, invokeOrReturn);

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

/**
 * @param {object} ref
 * @param {() => object} createHandle
 * @param {any[]} args
 */
export function useImperativeHandle(ref, createHandle, args) {
	args.push(ref);
	useLayoutEffect(() => {
		if (ref) ref.current = createHandle();
	}, args);
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
 * @type {<T extends string | number>(value: T, cb?: (value: T) => string | number) => void}
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
	afterPaint = (component) => {
		if ((!component._afterPaintQueued && (component._afterPaintQueued = true) && afterPaintEffects.push(component) === 1) ||
		    prevRaf !== options.requestAnimationFrame) {
			prevRaf = options.requestAnimationFrame;

			/* istanbul ignore next */
			(options.requestAnimationFrame || safeRaf)(flushAfterPaintEffects);
		}
	};
}

/**
 * @param {import('./internal').EffectHookState[]} effects
 */
export function handleEffects(effects) {
	effects.some(h => {
		h._cleanup && h._cleanup();
	});
	effects.some(h => {
		const result = h._value();
		if (typeof result === 'function') h._cleanup = result;
	});
	return [];
}

/**
 * @param {any[]} oldArgs
 * @param {any[]} newArgs
 */
function argsChanged(oldArgs, newArgs) {
	return !oldArgs || newArgs.some((arg, index) => arg !== oldArgs[index]);
}

function invokeOrReturn(arg, f) {
	return typeof f === 'function' ? f(arg) : f;
}
