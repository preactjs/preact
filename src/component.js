import { assign } from './util';
import { addCommitCallback, commitRoot } from './diff/commit';
import options from './options';
import { createVNode, Fragment } from './create-element';
import { patch } from './diff/patch';
import { DIRTY_BIT, FORCE_UPDATE, MODE_UNMOUNTING } from './constants';
import { getParentDom } from './tree';

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
		s = this._nextState = assign({}, this.state);
	}

	if (typeof update == 'function') {
		// Some libraries like `immer` mark the current state as readonly,
		// preventing us from mutating it, so we need to clone it. See #2716
		update = update(assign({}, s), this.props);
	}

	if (update) {
		assign(s, update);
	}

	// Skip update if updater function returned null
	if (update == null) return;

	if (this._internal) {
		if (callback) addCommitCallback(this._internal, callback);
		enqueueRender(this);
	}
};

/**
 * Immediately perform a synchronous re-render of the component
 * @this {import('./internal').Component}
 * @param {() => void} [callback] A function to be called after component is
 * re-rendered
 */
Component.prototype.forceUpdate = function(callback) {
	if (this._internal) {
		// Set render mode so that we can differentiate where the render request
		// is coming from. We need this because forceUpdate should never call
		// shouldComponentUpdate
		this._internal._flags |= FORCE_UPDATE;
		if (callback) addCommitCallback(this._internal, callback);
		enqueueRender(this);
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
 * Trigger in-place re-rendering of a component.
 * @param {import('./internal').Component} component The component to rerender
 */
function rerenderComponent(component) {
	let internal = component._internal;

	if (~internal._flags & MODE_UNMOUNTING && internal._flags & DIRTY_BIT) {
		let parentDom = getParentDom(internal);
		const vnode = createVNode(
			internal.type,
			internal.props,
			internal.key, // @TODO we shouldn't need to actually pass these
			internal.ref, // since the mode flag should bypass key/ref handling
			0
		);

		const commitQueue = [];
		patch(parentDom, vnode, internal, component._globalContext, commitQueue);
		commitRoot(commitQueue, internal);
	}
}

/**
 * The render queue
 * @type {Array<import('./internal').Component>}
 */
let rerenderQueue = [];

/**
 * Asynchronously schedule a callback
 * @type {(cb: () => void) => void}
 */
/* istanbul ignore next */
// Note the following line isn't tree-shaken by rollup cuz of rollup/rollup#2566
const defer =
	typeof Promise == 'function'
		? Promise.prototype.then.bind(Promise.resolve())
		: setTimeout;

/*
 * The value of `Component.debounce` must asynchronously invoke the passed in callback. It is
 * important that contributors to Preact can consistently reason about what calls to `setState`, etc.
 * do, and when their effects will be applied. See the links below for some further reading on designing
 * asynchronous APIs.
 * * [Designing APIs for Asynchrony](https://blog.izs.me/2013/08/designing-apis-for-asynchrony)
 * * [Callbacks synchronous and asynchronous](https://blog.ometer.com/2011/07/24/callbacks-synchronous-and-asynchronous/)
 */

let prevDebounce;

/**
 * Enqueue a rerender of a component
 * @param {import('./internal').Component} c The component to rerender
 */
export function enqueueRender(c) {
	if (
		(!(c._internal._flags & DIRTY_BIT) &&
			(c._internal._flags |= DIRTY_BIT) &&
			rerenderQueue.push(c) &&
			!process._rerenderCount++) ||
		prevDebounce !== options.debounceRendering
	) {
		prevDebounce = options.debounceRendering;
		(prevDebounce || defer)(process);
	}
}

/** Flush the render queue by rerendering all queued components */
function process() {
	let queue;
	while ((process._rerenderCount = rerenderQueue.length)) {
		queue = rerenderQueue.sort(
			(a, b) => a._internal._depth - b._internal._depth
		);
		rerenderQueue = [];
		// Don't update `renderCount` yet. Keep its value non-zero to prevent unnecessary
		// process() calls from getting scheduled while `queue` is still being consumed.
		queue.some(rerenderComponent);
	}
}
process._rerenderCount = 0;
