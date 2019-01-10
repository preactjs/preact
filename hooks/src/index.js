import { options } from 'preact';

const hasWindow = typeof window !== 'undefined';
const mc = new MessageChannel();
let currentIndex;
let component;
let afterPaintEffects = [];
let stateChanged;

let oldBeforeRender = options.beforeRender;
options.beforeRender = vnode => {
	if (oldBeforeRender) oldBeforeRender(vnode);

	component = vnode._component;
	currentIndex = 0;

	const hooks = component.__hooks;

	if (hooks) {
		let effect;
		while (effect = hooks._pendingEffects.shift()) {
			invokeEffect(effect);
		}
	}
};


let oldAfterDiff = options.afterDiff;
options.afterDiff = vnode => {
	if (oldAfterDiff) oldAfterDiff(vnode);

	const c = vnode._component;
	if (!c) return;

	const hooks = c.__hooks;

	if (hooks) {
		stateChanged = false;

		let effect;
		while (effect = hooks._pendingLayoutEffects.shift()) {
			invokeEffect(effect);
		}

		if (stateChanged) c.forceUpdate();
	}
};


let oldBeforeUnmount = options.beforeUnmount;
options.beforeUnmount = vnode => {
	if (oldBeforeUnmount) oldBeforeUnmount(vnode);

	const c = vnode._component;
	const hooks = c.__hooks;

	if (hooks) {
		for (let i = 0; i < hooks._list.length; i++) {
			if (hooks._list[i]._cleanup) {
				hooks._list[i]._cleanup();
			}
		}
	}
};

const createHook = (create, shouldRun) => (...args) => {
	if (component == null) return;

	const hooks = component.__hooks || (component.__hooks = { _list: [], _pendingEffects: [], _pendingLayoutEffects: [] });

	let _index = currentIndex++;
	let hook = hooks._list[_index];

	if (!hook) {
		hook = hooks._list[_index] = { _index };
		hook._run = create(hook, component, ...args);
	}
	else if (shouldRun && shouldRun(hook._args, args) === false) {
		return hook._value;
	}

	hook._args = args;

	return (hook._value = hook._run(...args));
};

export const useState = createHook((hook, component, initialValue) => {
	const stateId = 'hs' + hook._index;
	const ret = [
		component.state[stateId] = typeof initialValue == 'function' ? initialValue() : initialValue,
		value => {
			const setter = {};
			ret[0] = setter[stateId] = typeof value == 'function' ? value(ret[0]) : value;
			stateChanged = true;
			component.setState(setter);
		}
	];
	return () => ret;
});

export const useReducer = createHook((hook, component, reducer, initialState, initialAction) => {
	const stateId = 'hr' + hook._index;
	const ret = [
		component.state[stateId] = initialAction ? reducer(initialState, initialAction) : initialState,
		action => {
			const setter = {};
			ret[0] = setter[stateId] = reducer(ret[0], action);
			stateChanged = true;
			component.setState(setter);
		}
	];
	return () => ret;
});

export const useEffect = hasWindow ? createHook((hook, component) => {
	return callback => {
		component.__hooks._pendingEffects.push([hook, callback]);
		afterPaint(component);
	};
}, propsChanged) : noop;

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
}

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
		if (props[i] !== oldProps[i]) {
			return true;
		}
	}

	return false;
}

function memoChanged(oldArgs, newArgs) {
	const rerun = propsChanged(oldArgs, newArgs);

	return rerun !== undefined
		? rerun
		: newArgs[0] !== oldArgs[0];
}

function noop() { };