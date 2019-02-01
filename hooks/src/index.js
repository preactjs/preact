import { options } from 'preact';

const hasWindow = typeof window !== 'undefined';
const mc = new MessageChannel();

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

	const hooks = currentComponent.__hooks;

	if (!hooks) return;

	let effect;
	while (effect = hooks._pendingEffects.shift()) {
		invokeEffect(effect);
	}
};


let oldAfterDiff = options.afterDiff;
options.afterDiff = vnode => {
	if (oldAfterDiff) oldAfterDiff(vnode);

	const c = vnode._component;
	if (!c) return;

	const hooks = c.__hooks;

	if (!hooks) return;

	stateChanged = false;

	let effect;
	while (effect = hooks._pendingLayoutEffects.shift()) {
		invokeEffect(effect);
	}

	if (stateChanged) c.forceUpdate();
};


let oldBeforeUnmount = options.beforeUnmount;
options.beforeUnmount = vnode => {
	if (oldBeforeUnmount) oldBeforeUnmount(vnode);

	const c = vnode._component;
	const hooks = c.__hooks;

	if (!hooks) return;

	for (let i = 0; i < hooks._list.length; i++) {
		if (hooks._list[i]._cleanup) {
			hooks._list[i]._cleanup();
		}
	}
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

const useStateReducer = (state, newState) => typeof newState === 'function' ? newState(state) : newState;
export const useState = initialState => useReducer(useStateReducer, initialState);

export const useReducer = createHook((hook, component, reducer, initialState, initialAction) => {
	const initState = typeof initialState === 'function' ? initialState() : initialState;
	const ret = [
		component.state[hook._index] = initialAction ? reducer(initState, initialAction) : initState,
		action => {
			const setter = {};
			ret[0] = setter[hook._index] = reducer(ret[0], action);
			stateChanged = true;
			component.setState(setter);
		}
	];
	return () => ret;
});

// eslint-disable-next-line arrow-body-style
export const useEffect = hasWindow ? createHook((hook, component) => {
	return callback => {
		component.__hooks._pendingEffects.push([hook, callback]);
		afterPaint(component);
	};
}, propsChanged) : noop;

// eslint-disable-next-line arrow-body-style
export const useLayoutEffect = hasWindow ? createHook((hook, component) => {
	return callback => component.__hooks._pendingLayoutEffects.push([hook, callback]);
}, propsChanged) : noop;

export const useRef = createHook((hook, component, initialValue) => {
	const ref = { current: initialValue };
	return () => ref;
});

export const useMemo = createHook(() => callback => callback(), memoChanged);
export const useCallback = createHook(() => callback => callback, propsChanged);


// Note: if someone used Component.debounce = requestAnimationFrame,
// then effects will ALWAYS run on the NEXT frame instead of the current one, incurring a ~16ms delay.
// Perhaps this is not such a big deal.
/**
 * Invoke a component's pending effects after the next frame renders
 * @param {import('./internal').Component} args
 */
function afterPaint(args) {
	if (afterPaintEffects.push(args) === 1) {
		requestAnimationFrame(onPaint);
	}
}

function onPaint() {
	mc.port1.postMessage(0);
}

mc.port2.onmessage = () => {
	afterPaintEffects.splice(0, afterPaintEffects.length).forEach(component => {
		if (!component._parentDom) return;
		const effects = component.__hooks._pendingEffects;
		effects.splice(0, effects.length).forEach(invokeEffect);
	});
};

/**
 * Invoke a Hook's effect
 * @param {import('./internal').Effect} effect
 */
function invokeEffect(effect) {
	const [hook, callback] = effect;
	if (hook._cleanup) hook._cleanup();
	const result = callback();
	if (typeof result === 'function') hook._cleanup = result;
}

function propsChanged(oldArgs, newArgs) {
	const props = newArgs[1];
	if (!props) return undefined;

	const oldProps = oldArgs[1];

	for (let i = 0; i < props.length; i++) {
		if (props[i] !== oldProps[i]) return true;
	}

	return false;
}

function memoChanged(oldArgs, newArgs) {
	const propsDidChange = propsChanged(oldArgs, newArgs);

	return propsDidChange !== undefined
		? propsDidChange
		: newArgs[0] !== oldArgs[0];
}

function noop() {}
