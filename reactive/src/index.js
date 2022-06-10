import { options, Component, h } from 'preact';
import { useRef } from 'preact/hooks';
import { createEffect, createMemo, createSignal } from './lib';

/** @type {number} */
let currentIndex;

/** @type {import('./internal').Atom} */
let currentAtom;

/** @type {import('./internal').Component} */
let currentComponent;

/** @type {Array<import('./internal').Component>} */
let afterPaintEffects = [];

let oldDiff = options._diff;
let oldRender = options._render;
let oldDiffed = options.diffed;
let oldBeforeUnmount = options.unmount;

options._diff = vnode => {
	currentComponent = null;
	if (oldDiff) oldDiff(vnode);
};

options._render = vnode => {
	if (oldRender) oldRender(vnode);
	currentComponent = vnode._component;
};

options.diffed = vnode => {
	if (oldDiffed) oldDiffed(vnode);
	currentComponent = null;
};

export function $(fn) {
	const c = currentComponent;
	if (!c.__reactive) {
		c.__reactive = null;

		const v = createMemo(fn);
		createEffect(() => {
			c.__reactive = v();
			c.setState({});
		});
	}

	return c.__reactive;
}

/**
 * @template T
 * @param {T} initialValue
 * @returns {[import('./index').ReadReactive<T>, import('./index').StateUpdater<T>]}
 */
export function signal(initialValue) {
	const ref = useRef(null);
	return ref.current || (ref.current = createSignal(initialValue));
}

/**
 * @template T
 * @param {() => T} fn
 * @returns {import('./internal').Atom<T>}
 */
export function memoized(fn) {
	const ref = useRef(null);
	return ref.current || (ref.current = createMemo(fn));
}

/**
 * @param {() => any} fn
 * @returns {void}
 */
export function effect(fn) {}

/**
 * @template T
 * @param {T} value
 * @returns {import('./index').ReadReactive<T>}
 */
export function readonly(value) {
	const ref = useRef(null);
	return ref.current || (ref.current = createSignal(value));
}

/**
 * @template T
 * @param {import('preact').Context<T>} context
 * @returns {import('./internal').Atom<T>}
 */
export function inject(context) {
	const atom = getAtom(
		currentIndex++,
		undefined,
		KIND_COMPUTED,
		'inject_' + (context.displayName || 'unknown')
	);

	const provider = currentComponent.context[context._id];

	// The devtools needs access to the context object to
	// be able to pull of the default value when no provider
	// is present in the tree.
	atom._context = context;
	if (!provider) {
		atom._value = context._defaultValue;
		return atom;
	}

	function InjectedContext(props) {}
	// @ts-ignore
	InjectedContext.prototype = new Component();
	InjectedContext.prototype.render = function() {
		atom._value = provider.props.value;
		const subs = graph.subs.get(atom);
		if (subs && subs.size > 0) {
			invalidate(atom);
		}
		return null;
	};

	// This is probably not safe to convert to "!"
	if (atom._value == null) {
		atom._value = provider.props.value;

		const vnode = h(InjectedContext, {});

		const c = new InjectedContext({});
		c._force = false;
		c._vnode = vnode;
		c._parentDom = currentComponent._parentDom;
		c._children = [];
		c._renderCallbacks = [];
		vnode._component = c;
		provider.sub(c);
	}

	return atom;
}

/**
 * @template T
 * @param {T} initialValue
 * @returns {{ current: T}}
 */
export function ref(initialValue) {
	const atom = getAtom(currentIndex++, undefined, KIND_SOURCE);
	if (atom._value === undefined) {
		atom._value = { current: initialValue };
	}
	return atom._value;
}
