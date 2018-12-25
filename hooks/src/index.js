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
	const pendingEffects = component.__hooks && component.__hooks.pendingEffects;

	if (pendingEffects && pendingEffects.length) {
		for (let i=0; i<pendingEffects.length; i++) {
			invokeEffect(pendingEffects[i]);
		}
		pendingEffects.length = 0;
	}
};


let oldCommitRoot = options.commitRoot;
options.commitRoot = vnode => {
	if (oldCommitRoot) oldCommitRoot(vnode);

	// TODO: Find out why vnode can be null
	if (!vnode) return;

	const c = vnode._component;
	const pendingLayoutEffects = c.__hooks && c.__hooks.pendingLayoutEffects;

	if (pendingLayoutEffects && pendingLayoutEffects.length) {
		stateChanged = false;

		for (let i=0; i<pendingLayoutEffects.length; i++) {
			invokeEffect(pendingLayoutEffects[i]);
		}

		pendingLayoutEffects.length = 0;

		if (stateChanged) c.forceUpdate();
	}
};


let oldBeforeUnmount = options.beforeUnmount;
options.beforeUnmount = vnode => {
	if (oldBeforeUnmount) oldBeforeUnmount();

	const c = vnode._component;
	const hooks = c.__hooks;

	if (!hooks) return;

	for (let i=0; i<hooks.list.length; i++) {
		if (hooks.list[i].cleanup) {
			hooks.list[i].cleanup();
		}
	}
};

const createHook = (create, hasPropFilter) => (...args) => {
	if (component == null) return;

	const hooks = component.__hooks || (component.__hooks = { list: [], pendingEffects: [], pendingLayoutEffects: [] });
	const list = hooks.list;
	const last = args[args.length - 1];
	const props = hasPropFilter && Array.isArray(last) ? last : undefined;
	let index = currentIndex++;
	let hook = list[index];

	if (!hook) {
		hook = list[index] = { index, props, value: undefined };
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
}, false);

export const useEffect = createHook((hook, inst) => {
	return callback => {
		const effect = [hook, callback, inst];
		inst.__hooks.pendingEffects.push(effect);
		afterPaint(effect);
	};
}, true);

export const useLayoutEffect = createHook((hook, inst) => {
	return callback => {
		const effect = [hook, callback];
		inst.__hooks.pendingLayoutEffects.push(effect);
	};
}, true);

const hasWindow = typeof window !== 'undefined';
const afterPaint = hasWindow ? windowAfterPaint : () => {};

// Note: if someone used Component.debounce = requestAnimationFrame,
// then effects will ALWAYS run on the NEXT frame instead of the current one, incurring a ~16ms delay.
// Perhaps this is not such a big deal.
function windowAfterPaint(args) {
	if (afterPaintEffects.push(args) === 1) {
		requestAnimationFrame(onPaint);
	}
}

function onPaint() {
  setTimeout(fire, 0);
}

function fire() {
  for (let i=0; i<afterPaintEffects.length; i++) {
		const effect = afterPaintEffects[i];
		const inst = effect[2];
		const effects = inst.__hooks.pendingEffects;

		for (let j=0; j<effects.length; j++) {
			if (effects[j] === effect) {
				effects.splice(j, 1);
				if (inst._parentDom) invokeEffect(effect);
				break;
			}
		}
  }
  afterPaintEffects.length = 0;
}

function invokeEffect(effect) {
	const [hook, callback] = effect;
	if (hook.cleanup) hook.cleanup();
	const result = callback();
	if (typeof result === 'function') hook.cleanup = result;
}