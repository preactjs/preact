import { options } from 'preact';

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
		let item;
		while (item=hooks._pendingEffects.shift()) {
			invokeEffect(item);
		}
	}
};


let oldCommitRoot = options.commitRoot;
options.commitRoot = vnode => {
	if (oldCommitRoot) oldCommitRoot(vnode);

	// TODO: Find out why vnode can be null
	if (!vnode) return;

	const c = vnode._component;
	const hooks = c.__hooks;

	if (hooks) {
		stateChanged = false;

		let item;
		while (item=hooks._pendingLayoutEffects.shift()) {
			invokeEffect(item);
		}

		if (stateChanged) c.forceUpdate();
	}
};


let oldBeforeUnmount = options.beforeUnmount;
options.beforeUnmount = vnode => {
	if (oldBeforeUnmount) oldBeforeUnmount();

	const c = vnode._component;
	const hooks = c.__hooks;

	if (hooks) {
		for (let i=0; i<hooks._list.length; i++) {
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
	else if (shouldRun && !shouldRun(hook._args, args)) {
		return hook._value;
	}

	hook._args = args;

	return (hook._value = hook._run(...args));
};

export const useState = createHook((hook, inst, initialValue) => {
	const stateId = 'hs' + hook._index;

	let value = typeof initialValue === 'function' ? initialValue() : initialValue;
	const setter = {};
	setter[stateId] = inst.state[stateId] = value;

	function set(v) {
		value = setter[stateId] = typeof v === 'function' ? v(value) : v;
		stateChanged = true;
		inst.setState(setter);
	}

	return () => [value, set];
});

export const useReducer = createHook((hook, inst, reducer, initialState, initialAction) => {
	const stateId = 'hr' + hook._index;

	const setter = {};
	let state = initialAction ? reducer(initialState, initialAction) : initialState;
	setter[stateId] = state;

	return () => [
		state,
		action => {
			setter[stateId] = state = reducer(state, action);
			stateChanged = true;
			inst.setState(setter);
		}
	];
});

export const useEffect = window ? createHook((hook, inst) => {
	return callback => {
		const effect = [hook, callback, inst];
		inst.__hooks._pendingEffects.push(effect);
		afterPaint(effect);
	};
}, propsChanged) : noop;

export const useLayoutEffect = window ? createHook((hook, inst) => {
	return callback => inst.__hooks._pendingLayoutEffects.push([hook, callback]);
}, propsChanged) : noop;

export const useRef = createHook((hook, inst, initialValue) => {
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
  setTimeout(fire);
}

function fire() {
	let effect;
	while (effect=afterPaintEffects.shift()) {
		const inst = effect[2];
		const effects = inst.__hooks._pendingEffects;

		for (let j=0; j<effects.length; j++) {
			if (effects[j] === effect) {
				effects.splice(j, 1);
				if (inst._parentDom) invokeEffect(effect);
				break;
			}
		}
  }
}

function invokeEffect(effect) {
	const [hook, callback] = effect;
	if (hook._cleanup) hook._cleanup();
	const result = callback();
	if (typeof result === 'function') hook._cleanup = result;
}

const notApplicable = {};

function propsChanged(oldArgs, newArgs) {
	const props = newArgs.length > 1 ? newArgs[1] : undefined;
	if (!props) return notApplicable;

	const oldProps = oldArgs[1];

	for (let i=0; i<props.length; i++) {
		if (props[i] !== oldProps[i]) {
			return true;
		}
	}

	return false;
}

function memoChanged(oldArgs, newArgs) {
	const rerun = propsChanged(oldArgs, newArgs);

	return rerun !== notApplicable
		? rerun
		: newArgs[0] !== oldArgs[0];
}

function noop() {};