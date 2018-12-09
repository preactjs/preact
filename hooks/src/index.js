import { options } from 'preact';

let currentIndex;
let component;
let oldBeforeRender = options.beforeRender;

options.beforeRender = vnode => {
	component = vnode._component;
	currentIndex = 0;
	if (oldBeforeRender) oldBeforeRender(vnode)
}

const createHook = (create) => (...args) => {
	if (component == null) return;

	const list = component.__hooks || (component.__hooks = []);
	let index = currentIndex++;
	let hook = list[index];

	if (!hook) {
		hook = list[index] = { index, value: undefined };
		hook.run = create(hook, component, ...args);
	}

	return (hook.value = hook.run());
};

export const useState = createHook((hook, inst, initialValue) => {
	const stateId = 'hookstate$' + hook.index;

	let value = typeof initialValue === 'function' ? initialValue() : initialValue;
	const setter = {};
	setter[stateId] = inst.state[stateId] = value;

	function set(v) {
		value = setter[stateId] = typeof v === 'function' ? v(value) : v;
		inst.setState(setter);
	}

	return () => [value, set];
});