import { options } from 'preact';

/** @type {number} */
let currentIndex;

/** @type {import('./internal').Component} */
let currentComponent;

/** @type {Array<import('./internal').Component>} */
let afterPaintEffects = [];

/** @type {boolean} */
let stateChanged;

let oldBeforeRender = options.beforeRender;
options.beforeRender = vnode => {
	if (oldBeforeRender) oldBeforeRender(vnode);

	currentComponent = vnode._component;
	currentIndex = 0;

	if (!currentComponent.__hooks) return;
	currentComponent.__hooks._pendingEffects.forEach(invokeEffect);
	currentComponent.__hooks._pendingEffects = [];
};


let oldAfterDiff = options.afterDiff;
options.afterDiff = vnode => {
	if (oldAfterDiff) oldAfterDiff(vnode);

	const c = vnode._component;
	if (!c) return;

	const hooks = c.__hooks;
	if (!hooks) return;

	stateChanged = false;

	hooks._pendingLayoutEffects.forEach(invokeEffect);
	hooks._pendingLayoutEffects = [];

	if (stateChanged) c.forceUpdate();
};


let oldBeforeUnmount = options.beforeUnmount;
options.beforeUnmount = vnode => {
	if (oldBeforeUnmount) oldBeforeUnmount(vnode);

	const hooks = vnode._component.__hooks;
	if (!hooks) return;

	hooks._list.forEach(hook => hook._cleanup && hook._cleanup());
};

/**
 * Get a hook's state from the currentComponent
 * @param {number} index The index of the hook to get
 * @returns {import('./internal').HookState}
 */
function getHookState(index) {
	// Largely inspired by:
	// * https://github.com/michael-klein/funcy.js/blob/master/src/hooks/core_hooks.mjs
	// * https://github.com/michael-klein/funcy.js/blob/master/src/lib/renderer.mjs
	// Other implementations to look at:
	// * https://codesandbox.io/s/mnox05qp8

	const hooks = currentComponent.__hooks || (currentComponent.__hooks = { _list: [], _pendingEffects: [], _pendingLayoutEffects: [] });

	// 503 B
	if (index >= hooks._list.length) {
		hooks._list.push({});
	}
	return hooks._list[index];

	// 506 B
	// if (index >= hooks._list.length) {
	// 	hooks._list.push(initialState);
	// 	return initialState;
	// }
	// else {
	// 	return hooks._list[index];
	// }

	// 505 B
	// if (index < hooks._list.length) {
	// 	return hooks._list[index];
	// }
	// else {
	// 	hooks._list.push(initialState);
	// 	return initialState;
	// }
}

export function useState(initialState) {
	return useReducer(invokeOrReturn, initialState);
}

export function useReducer(reducer, initialState, initialAction) {
	// 710 B
	// /** @type {import('./internal').ReducerHookState} */
	// const state = getHookState(currentIndex++, {});
	// if (state._component == null) {
	// 	state._component = currentComponent;
	// 	// state._value = typeof initialState === 'function' ? initialState(): initialState;
	// 	// state._value = initialAction ? reducer(invokeOrReturn(null, initialState), initialAction) : invokeOrReturn(null, initialState);
	// 	state._value = invokeOrReturn(null, initialState);
	// 	if (initialAction) {
	// 		state._value = reducer(state._value, initialAction);
	// 	}
	// }
	// return [
	// 	state._value,
	// 	action => {
	// 		state._value = reducer(state._value, action);
	// 		stateChanged = true; // +(15-18) B!!
	// 		state._component.setState({});
	// 	}
	// ];

	// 716 B
	/** @type {import('./internal').ReducerHookState} */
	const hookState = getHookState(currentIndex++);
	if (hookState._component == null) {
		hookState._component = currentComponent;
		hookState._value = [
			initialAction
				? reducer(invokeOrReturn(null, initialState), initialAction)
				: invokeOrReturn(null, initialState),
			action => {
				hookState._value[0] = reducer(hookState._value[0], action);
				stateChanged = true;
				hookState._component.setState({});
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
	// const state = getHookState(currentIndex++, { _value: callback, _args: null, _cleanup: null }); // +11 B
	// if (args == null || state._args == null || args.some((prop, index) => prop !== state._args[index])) { // -1 B
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
	// const state = getHookState(currentIndex++, { _value: callback, _args: null, _cleanup: null }); // +11 B
	// if (args == null || state._args == null || args.some((prop, index) => prop !== state._args[index])) { // -1 B
	if (argsChanged(state._args, args)) {
		state._value = callback;
		state._args = args;

		currentComponent.__hooks._pendingLayoutEffects.push(state);
	}
}

export function useRef(initialValue) {
	const state = getHookState(currentIndex++);
	if (state._value == null) {
		state._value = { current: initialValue };
	}

	return state._value;
}

/**
 * @param {() => any} callback
 * @param {any[]} args
 */
export function useMemo(callback, args) {

	/** @type {import('./internal').MemoHookState} */
	const state = getHookState(currentIndex++);
	// if (args == null ? callback !== state._callback : state._args == null || args.some((prop, index) => prop !== state._args[index])) { // -1 B
	if (args == null ? callback !== state._callback : argsChanged(state._args, args)) {
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
	// const provider = currentComponent.context[context._id];
	// return provider ? provider.props.value : context._defaultValue;


	// 785 B
	const provider = currentComponent.context[context._id];
	if (provider == null) return context._defaultValue;
	const state = getHookState(currentIndex++);
	if (state._value == null) {
		state._value = true;
		provider.sub(currentComponent);
	}
	return provider.props.value;

	// 783 B
	// const provider = currentComponent.context[context._id];
	// const state = getHookState(currentIndex++);
	// if (state._value == null) {
	// 	state._value = true;
	// 	provider && provider.sub(currentComponent);
	// }
	// return provider ? provider.props.value : context._defaultValue;

	// TODO: Unmounting this component (and Consumers) should clean up subscription
	// Perhaps use a [layout] effect to model this? Will want to make sure a Provider
	// that sets a value on mount triggers a re-render of all useContexts...
}

// Note: if someone used Component.debounce = requestAnimationFrame,
// then effects will ALWAYS run on the NEXT frame instead of the current one, incurring a ~16ms delay.
// Perhaps this is not such a big deal.
/**
 * Invoke a component's pending effects after the next frame renders
 * @type {(component: import('./internal').Component) => void}
 */
let afterPaint = () => {};

/** @type {MessageChannel} */
let mc;

function onPaint() {
	mc.port1.postMessage(undefined);
}

if (typeof window !== 'undefined') {
	mc = new MessageChannel();

	afterPaint = (component) => {
		// TODO: Consider ways to avoid queuing a component multiple times
		// due to multiple `useEffect`s
		if (afterPaintEffects.push(component) === 1) {
			requestAnimationFrame(onPaint);
		}
	};

	mc.port2.onmessage = () => {
		afterPaintEffects.forEach(component => {
			if (!component._parentDom) return;
			component.__hooks._pendingEffects.forEach(invokeEffect);
			component.__hooks._pendingEffects = [];
		});
		afterPaintEffects = [];
	};
}

/**
 * Invoke a Hook's effect
 * @param {import('./internal').EffectHookState} hook
 */
function invokeEffect(hook) {
	if (hook._cleanup) hook._cleanup();
	const result = hook._value();
	if (typeof result === 'function') hook._cleanup = result;
}

function argsChanged(oldArgs, newArgs) {
	return oldArgs == null || newArgs.some((arg, index) => arg !== oldArgs[index]);
}

function invokeOrReturn(arg, f) {
	return typeof f === 'function' ? f(arg) : f;
}
