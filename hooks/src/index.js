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
 * Create a Hook instance and invoke its implementation as determined by
 * the `shouldRun` parameter
 * @param {import('./internal').HookImplementationFactory} create
 * @param {import('./internal').HookShouldRun} [shouldRun]
 * @returns {import('./internal').Hook}
 */
const createHook = (create, shouldRun) => (...args) => {
	if (!currentComponent) return;

	const hooks = currentComponent.__hooks || (currentComponent.__hooks = { _list: [], _pendingEffects: [], _pendingLayoutEffects: [] });

	let _index = currentIndex++;
	let hook = hooks._list[_index];

	if (!hook) {
		hook = hooks._list[_index] = { _index };
		hook._run = create(hook, currentComponent, ...args);
	}
	else if (shouldRun && shouldRun(hook._args, args) === false) {
		return hook._value;
	}

	hook._args = args;

	return (hook._value = hook._run(...args));
};

export const useState = initialState => useReducer(invokeOrReturn, initialState);

export const useReducer = createHook((hook, component, reducer, initialState, initialAction) => {
	const initState = invokeOrReturn(undefined, initialState);
	const ret = [
		component.state[hook._index] = initialAction ? reducer(initState, initialAction) : initState,
		action => {
			stateChanged = true;
			component.setState(state => ret[0] = state[hook._index] = reducer(ret[0], action));
		}
	];
	return () => ret;
});

// eslint-disable-next-line arrow-body-style
export const useEffect = createHook((hook, component) => {
	return callback => {
		component.__hooks._pendingEffects.push(hook);
		afterPaint(component);
		return callback;
	};
}, propsChanged);

// eslint-disable-next-line arrow-body-style
export const useLayoutEffect = createHook((hook, component) => {
	return callback => {
		component.__hooks._pendingLayoutEffects.push(hook);
		return callback;
	};
}, propsChanged);

export const useRef = createHook((hook, component, initialValue) => {
	const ref = { current: initialValue };
	return () => ref;
});

export const useMemo = createHook(() => callback => callback(), memoChanged);
export const useCallback = createHook(() => callback => callback, propsChanged);

export const useContext = createHook((hook, component, context) => {
	let provider = component.context[context._id];
	provider && provider.sub(component);
	return () => provider ? provider.props.value : context._defaultValue;
});

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
 * @param {import('./internal').HookInstance} hook
 */
function invokeEffect(hook) {
	if (hook._cleanup) hook._cleanup();
	const result = hook._value();
	if (typeof result === 'function') hook._cleanup = result;
}

function propsChanged(oldArgs, newArgs) {
	return newArgs[1] === undefined || newArgs[1].some((prop, index) => prop !== oldArgs[1][index]);
}

function memoChanged(oldArgs, newArgs) {
	return newArgs[1] !== undefined ? propsChanged(oldArgs, newArgs) : newArgs[0] !== oldArgs[0];
}

function invokeOrReturn(arg, f) {
	return typeof f === 'function' ? f(arg) : f;
}
