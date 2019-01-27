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

// /**
//  * Create a Hook instance and invoke its implementation as determined by
//  * the `shouldRun` parameter
//  * @param {import('./internal').HookImplementationFactory} create
//  * @param {import('./internal').HookShouldRun} [shouldRun]
//  * @returns {import('./internal').Hook}
//  */
// const createHook = (create, shouldRun) => (...args) => {
// 	if (!currentComponent) return;
//
// 	const hooks = currentComponent.__hooks || (currentComponent.__hooks = { _list: [], _pendingEffects: [], _pendingLayoutEffects: [] });
//
// 	let _index = currentIndex++;
// 	let hook = hooks._list[_index];
//
// 	if (!hook) {
// 		hook = hooks._list[_index] = { _index };
// 		hook._run = create(hook, currentComponent, ...args);
// 	}
// 	else if (shouldRun && shouldRun(hook._args, args) === false) {
// 		return hook._value;
// 	}
//
// 	hook._args = args;
//
// 	return (hook._value = hook._run(...args));
// };

/**
 * Get a hook's state from the currentComponent
 * @template State
 * @param {number} index The index of the hook to get
 * @param {State} initialState The initial state of the hook
 * @returns {State}
 */
function getHookState(index, initialState) {
	// Largely inspired by:
	// * https://github.com/michael-klein/funcy.js/blob/master/src/hooks/core_hooks.mjs
	// * https://github.com/michael-klein/funcy.js/blob/master/src/lib/renderer.mjs
	// Other implementations to look at:
	// * https://codesandbox.io/s/mnox05qp8

	// TODO: Consider initializing in beforeRender hook
	const hooks = currentComponent.__hooks || (currentComponent.__hooks = { _list: [], _pendingEffects: [], _pendingLayoutEffects: [] });

	// 503 B
	if (index >= hooks._list.length) {
		hooks._list.push(initialState);
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

// export const useState = initialState => useReducer(invokeOrReturn, initialState);
//
// export const useReducer = createHook((hook, component, reducer, initialState, initialAction) => {
// 	const initState = invokeOrReturn(undefined, initialState);
// 	const ret = [
// 		component.state[hook._index] = initialAction ? reducer(initState, initialAction) : initState,
// 		action => {
// 			stateChanged = true;
// 			component.setState(state => ret[0] = state[hook._index] = reducer(ret[0], action));
// 		}
// 	];
// 	return () => ret;
// });

// // eslint-disable-next-line arrow-body-style
// export const useEffect = createHook((hook, component) => {
// 	return callback => {
// 		component.__hooks._pendingEffects.push(hook);
// 		afterPaint(component);
// 		return callback;
// 	};
// }, propsChanged);

/**
 * @param {import('./internal').Effect} callback
 * @param {any[]} args
 */
export function useEffect(callback, args) {

	/** @type {import('./internal').EffectHookState} */
	const state = getHookState(currentIndex++, {});
	// const state = getHookState(currentIndex++, { _value: callback, _args: null, _cleanup: null }); // +11 B
	// if (args == null || state._args == null || args.some((prop, index) => prop !== state._args[index])) {
	if (argsChanged(state._args, args)) {
		state._value = callback;
		state._args = args;

		currentComponent.__hooks._pendingEffects.push(state);
		afterPaint(currentComponent);
	}
}

// // eslint-disable-next-line arrow-body-style
// export const useLayoutEffect = createHook((hook, component) => {
// 	return callback => {
// 		component.__hooks._pendingLayoutEffects.push(hook);
// 		return callback;
// 	};
// }, propsChanged);

/**
 * @param {import('./internal').Effect} callback
 * @param {any[]} args
 */
export function useLayoutEffect(callback, args) {

	/** @type {import('./internal').EffectHookState} */
	const state = getHookState(currentIndex++, {});
	// const state = getHookState(currentIndex++, { _value: callback, _args: null, _cleanup: null }); // +11 B
	// if (args == null || state._args == null || args.some((prop, index) => prop !== state._args[index])) {
	if (argsChanged(state._args, args)) {
		state._value = callback;
		state._args = args;

		currentComponent.__hooks._pendingLayoutEffects.push(state);
	}
}

// export const useRef = createHook((hook, component, initialValue) => {
// 	const ref = { current: initialValue };
// 	return () => ref;
// });

// export const useMemo = createHook(() => callback => callback(), memoChanged);
// export const useCallback = createHook(() => callback => callback, propsChanged);

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

// function memoChanged(oldArgs, newArgs) {
// 	return newArgs[1] !== undefined ? propsChanged(oldArgs, newArgs) : newArgs[0] !== oldArgs[0];
// }

// function invokeOrReturn(arg, f) {
// 	return typeof f === 'function' ? f(arg) : f;
// }
