import { options } from 'preact';

/** @type {import('./internal').Component} */
let currentComponent;

let oldBeforeDiff = options._diff;
let oldBeforeRender = options._render;
let oldAfterDiff = options.diffed;
let oldBeforeUnmount = options.unmount;

options._diff = vnode => {
	currentComponent = null;
	if (oldBeforeDiff) oldBeforeDiff(vnode);
};

options._render = vnode => {
	if (oldBeforeRender) oldBeforeRender(vnode);
	currentComponent = vnode._component;
};

options.diffed = vnode => {
	if (oldAfterDiff) oldAfterDiff(vnode);
	currentComponent = null;
};

options.unmount = vnode => {
	if (oldBeforeUnmount) oldBeforeUnmount(vnode);

	/** @type {import('./internal').Component | null} */
	const c = vnode._component;
	if (c) {
		const refs = c.__reactive;
		if (refs) {
			refs._atoms.forEach(value => value._unsubscribe());
			refs._atoms.clear();
		}
	}
};

const NOOP = () => {};

/**
 *
 * @param {*} component
 * @returns {import('./internal').Component["__reactive"]}
 */
function getReactiveState(component) {
	return (
		component.__reactive ||
		(component.__reactive = { _atoms: new Map(), _prevAtoms: new Map() })
	);
}

/**
 *
 * @param {import('./internal').Component["__reactive"]} refs
 * @param {import('./index').Atom<any>} atom
 * @returns
 */
function subscribeToAtom(refs, atom, component) {
	let sub = refs._prevAtoms.get(atom);
	if (!sub) {
		sub = {
			_unsubscribe: NOOP,
			_value: undefined,
			_component: component
		};
		sub._unsubscribe = atom.subscribe(v => {
			if (sub._value !== v) {
				sub._value = v;
				if (sub._unsubscribe !== NOOP) {
					sub._component.setState({});
				}
			}
		});
		refs._atoms.set(atom, sub);
	}

	return sub._value;
}

/**
 * Subscribe to RxJS-style observables
 * @type {import('./index').$}
 */
export function $(atom) {
	const refs = getReactiveState(currentComponent);
	return subscribeToAtom(refs, atom, currentComponent);
}

/**
 * @type {import('./index').component}
 */
export function component(fn) {
	return function Reactive(props) {
		const refs = getReactiveState(this);
		const view =
			this.__reactiveView ||
			(this.__reactiveView = fn(props, atom =>
				subscribeToAtom(refs, atom, this)
			));

		// TODO: Check if memory optimizations are worth it
		refs._prevAtoms = refs._atoms;
		refs._atoms = new Map();

		const ui = view(props, this);

		refs._prevAtoms.forEach((s, atom) => {
			if (!refs._atoms.has(atom)) {
				s._unsubscribe();
			}
		});

		return ui;
	};
}
