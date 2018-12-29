import { options, createRef } from 'preact';

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
			if (hooks._list[i].cleanup) {
				hooks._list[i].cleanup();
			}
		}
	}
};

const createHook = (create, hasPropFilter = false) => (...args) => {
	if (component == null) return;

	const hooks = component.__hooks || (component.__hooks = { _list: [], _pendingEffects: [], _pendingLayoutEffects: [] });
	const last = args[args.length - 1];
	const props = hasPropFilter && Array.isArray(last) ? last : undefined;
	let index = currentIndex++;
	let hook = hooks._list[index];

	if (!hook) {
		hook = hooks._list[index] = { index, props, value: undefined };
		hook.run = create(hook, component, ...args);
	}
	else if (props) {
		let changed = false;
		for (let i=0; i<props.length; i++) {
			if (props[i] !== hook.props[i]) {
				changed = true;
				break;
			}
		}

		hook.props = props;

		if (changed === false) return hook.value;
	}

	return (hook.value = hook.run(...args));
};

export const useState = createHook((hook, inst, initialValue) => {
	const stateId = 'hookstate$' + hook.index;

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

export const useEffect = createHook((hook, inst) => {
	return callback => {
		const effect = [hook, callback, inst];
		inst.__hooks._pendingEffects.push(effect);
		afterPaint(effect);
	};
}, true);

export const useLayoutEffect = createHook((hook, inst) => {
	return callback => {
		const effect = [hook, callback];
		inst.__hooks._pendingLayoutEffects.push(effect);
	};
}, true);

export const useRef = createHook((hook, inst, initialValue) => {
	const ref = createRef();
	ref.current = initialValue;
	return () => ref;
});

const afterPaint = window ? windowAfterPaint : () => {};

// Note: if someone used Component.debounce = requestAnimationFrame,
// then effects will ALWAYS run on the NEXT frame instead of the current one, incurring a ~16ms delay.
// Perhaps this is not such a big deal.
function windowAfterPaint(args) {
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
	if (hook.cleanup) hook.cleanup();
	const result = callback();
	if (typeof result === 'function') hook.cleanup = result;
}