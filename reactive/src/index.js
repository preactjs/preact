import { options, Component, h } from 'preact';
import { useRef } from 'preact/hooks';
import { createEffect, createMemo, createSignal, newAtom } from './lib';

/** @type {number} */
let currentIndex;

/** @type {import('./internal').Atom} */
let currentAtom;

/** @type {import('./internal').Component} */
let currentComponent;

/** @type {Array<import('./internal').Component>} */
let afterPaintEffects = [];

/**
 * @type {import('./internal').DAGraph}
 */
const graph = {
	deps: new Map(),
	subs: new Map()
};

const NOOP = () => {};

let atomHash = 0;

/** @type {import('./internal').AtomKind.SOURCE} */
const KIND_SOURCE = 1;
/** @type {import('./internal').AtomKind.COMPUTED} */
const KIND_COMPUTED = 2;
/** @type {import('./internal').AtomKind.REACTION} */
const KIND_REACTION = 3;

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
		c.__reactive = {
			_view: null,
			_scheduled: false
		};

		const v = createMemo(fn);
		const a = createEffect(() => {
			c.__reactive._view = v();
		});

		// a._execute = () => {
		// 	const r = a._execute();
		// 	if (!c.__reactive._scheduled) {
		// 		c.__reactive._scheduled = true;
		// 		console.log('call');
		// 		// c.forceUpdate();
		// 	}
		// 	return r;
		// };
	}

	console.log('RENDER', c.__reactive._view);
	c.__reactive._scheduled = false;
	return c.__reactive._view;
}

/**
 * @template T
 * @param {T} initialValue
 * @param {string} [displayName]
 * @returns {[import('./index').ReadReactive<T>, import('./index').StateUpdater<T>]}
 */
export function signal(initialValue, displayName) {
	const ref = useRef(null);
	return ref.current || (ref.current = createSignal(initialValue));
}

/**
 * @template T
 * @param {() => T} fn
 * @param {string} [displayName]
 * @returns {import('./internal').Atom<T>}
 */
export function computed(fn, displayName) {
	const ref = useRef(null);
	if (ref.current === null) {
		ref.current = createMemo(fn);
	}
	return ref.current;
}

/**
 *
 * @param {() => any} fn
 * @param {string} [displayName]
 * @returns {void}
 */
export function effect(fn, displayName) {}

/**
 * @template T
 * @param {T} value
 * @param {string} [displayName]
 * @returns {import('./index').ReadReactive<T>}
 */
export function readonly(value, displayName) {
	const atom = getAtom(currentIndex++, value, KIND_SOURCE, displayName);

	if (atom._value !== value) {
		atom._value = value;
		invalidate(atom);
	}

	return atom.read;
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
