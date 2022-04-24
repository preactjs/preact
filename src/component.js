import { commitRoot, rendererState } from './diff/commit';
import options from './options';
import { createVNode, Fragment } from './create-element';
import { patch } from './diff/patch';
import { DIRTY_BIT, FORCE_UPDATE, MODE_UNMOUNTING } from './constants';
import { getParentContext, getParentDom } from './tree';

/**
 * Base Component class. Provides `setState()` and `forceUpdate()`, which
 * trigger rendering
 * @param {object} props The initial component props
 * @param {object} context The initial context from parent components'
 * getChildContext
 */
export function Component(props, context) {
	this.props = props;
	this.context = context;
}

/**
 * Update component state and schedule a re-render.
 * @this {import('./internal').Component}
 * @param {object | ((s: object, p: object) => object)} update A hash of state
 * properties to update with new values or a function that given the current
 * state and props returns a new partial state
 * @param {() => void} [callback] A function to be called once component state is
 * updated
 */
Component.prototype.setState = function(update, callback) {
	// only clone state when copying to nextState the first time.
	let s;
	if (this._nextState != null && this._nextState !== this.state) {
		s = this._nextState;
	} else {
		s = this._nextState = Object.assign({}, this.state);
	}

	if (typeof update == 'function') {
		// Some libraries like `immer` mark the current state as readonly,
		// preventing us from mutating it, so we need to clone it. See #2716
		update = update(Object.assign({}, s), this.props);
	}

	if (update) {
		Object.assign(s, update);
	}

	// Skip update if updater function returned null
	if (update == null) return;

	const internal = this._internal;
	if (update != null && internal) {
		if (callback) internal._commitCallbacks.push(callback.bind(this));
		internal.rerender(internal);
	}
};

/**
 * Immediately perform a synchronous re-render of the component
 * @this {import('./internal').Component}
 * @param {() => void} [callback] A function to be called after component is
 * re-rendered
 */
Component.prototype.forceUpdate = function(callback) {
	const internal = this._internal;
	if (internal) {
		// Set render mode so that we can differentiate where the render request
		// is coming from. We need this because forceUpdate should never call
		// shouldComponentUpdate
		internal.flags |= FORCE_UPDATE;
		if (callback) internal._commitCallbacks.push(callback.bind(this));
		internal.rerender(internal);
	}
};

/**
 * Accepts `props` and `state`, and returns a new Virtual DOM tree to build.
 * Virtual DOM is generally constructed via [JSX](http://jasonformat.com/wtf-is-jsx).
 * @param {object} props Props (eg: JSX attributes) received from parent
 * element/component
 * @param {object} state The component's current state
 * @param {object} context Context object, as returned by the nearest
 * ancestor's `getChildContext()`
 * @returns {import('./index').ComponentChildren | void}
 */
Component.prototype.render = Fragment;

/**
 * @param {import('./internal').Internal} internal The internal to rerender
 */
function rerender(internal) {
	if (~internal.flags & MODE_UNMOUNTING && internal.flags & DIRTY_BIT) {
		const vnode = createVNode(
			internal.type,
			internal.props,
			internal.key, // @TODO we shouldn't need to actually pass these
			internal.ref, // since the mode flag should bypass key/ref handling
			0
		);

		rendererState._context = getParentContext(internal);
		rendererState._commitQueue = [];
		rendererState._parentDom = getParentDom(internal);
		patch(internal, vnode);
		commitRoot(internal);
	}
}

/**
 * The render queue
 * @type {Array<import('./internal').Internal>}
 */
let rerenderQueue = [];

/*
 * The value of `Component.debounce` must asynchronously invoke the passed in callback. It is
 * important that contributors to Preact can consistently reason about what calls to `setState`, etc.
 * do, and when their effects will be applied. See the links below for some further reading on designing
 * asynchronous APIs.
 * * [Designing APIs for Asynchrony](https://blog.izs.me/2013/08/designing-apis-for-asynchrony)
 * * [Callbacks synchronous and asynchronous](https://blog.ometer.com/2011/07/24/callbacks-synchronous-and-asynchronous/)
 */

let prevDebounce;

const defer = Promise.prototype.then.bind(Promise.resolve());

/**
 * Enqueue a rerender of an internal
 * @param {import('./internal').Internal} internal The internal to rerender
 */
export function enqueueRender(internal) {
	if (
		(!(internal.flags & DIRTY_BIT) &&
			(internal.flags |= DIRTY_BIT) &&
			rerenderQueue.push(internal) &&
			!process._rerenderCount++) ||
		prevDebounce !== options.debounceRendering
	) {
		prevDebounce = options.debounceRendering;
		(prevDebounce || defer)(process);
	}
}

/** Flush the render queue by rerendering all queued components */
function process() {
	while ((len = process._rerenderCount = rerenderQueue.length)) {
		rerenderQueue.sort((a, b) => a._depth - b._depth);
		while (len--) {
			rerender(rerenderQueue.shift());
		}
	}
}
let len = (process._rerenderCount = 0);
