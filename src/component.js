import { commitRoot } from './diff/commit';
import options from './options';
import { createElement, Fragment } from './create-element';
import { patch } from './diff/patch';
import {
	DIRTY_BIT,
	FORCE_UPDATE,
	MODE_HYDRATE,
	MODE_SUSPENDED,
	MODE_UNMOUNTING
} from './constants';
import { getDomSibling, getParentDom } from './tree';

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

	Object.assign(s, update);

	// Skip update if updater function returned null
	if (update == null) return;

	// The 0 flag value here prevents FORCE_UPDATE from being set
	renderComponentInstance.call(this, callback, 0);
};

/**
 * Immediately perform a synchronous re-render of the component
 * @param {() => void} [callback] A function to call after re-rendering completes
 * @this {import('./internal').Component}
 */
Component.prototype.forceUpdate = renderComponentInstance;

/**
 * Immediately perform a synchronous re-render of the component.
 * This method is the implementation of forceUpdate() for class components.
 * @param {() => void} [callback] A function to call after rendering completes
 * @param {number} [flags = FORCE_UPDATE] Flags to set. Defaults to FORCE_UPDATE.
 * @this {import('./internal').Component}
 */
export function renderComponentInstance(callback, flags) {
	if (this._internal) {
		// Set render mode so that we can differentiate where the render request
		// is coming from (eg: forceUpdate should never call shouldComponentUpdate).
		this._internal.flags |= flags == null ? FORCE_UPDATE : flags;
		this._internal.render(callback);
		// Note: the above is equivalent to invoking enqueueRender:
		// enqueueRender.call(this._internal, callback);
	}
}

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
 * Render an Internal that has been marked
 * @param {import('./internal').Internal} internal The internal to rerender
 */
const renderDirtyInternal = internal => {
	const commitQueue = [];

	const vnode = createElement(internal.type);
	vnode.props = internal.props;

	// Don't render unmounting/unmounted trees:
	if (internal.flags & MODE_UNMOUNTING) return;

	// Don't render trees already rendered in this pass:
	if (!(internal.flags & DIRTY_BIT)) return;

	let parentDom = getParentDom(internal);
	let startDom =
		(internal.flags & (MODE_HYDRATE | MODE_SUSPENDED)) ===
		(MODE_HYDRATE | MODE_SUSPENDED)
			? internal._dom
			: getDomSibling(internal, 0);

	patch(parentDom, vnode, internal, commitQueue, startDom);
	commitRoot(commitQueue, internal);
};

/**
 * A queue of Internals to be rendered in the next batch.
 * @type {Array<import('./internal').Internal>}
 */
let renderQueue = [];

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
 * Enqueue a rerender of a component
 * @this {import('./internal').Internal} internal The internal to rerender
 */
export function enqueueRender(callback) {
	let internal = this;
	if (callback) {
		if (internal._commitCallbacks == null) {
			internal._commitCallbacks = [];
		}
		internal._commitCallbacks.push(callback);
	}
	if (
		(!(internal.flags & DIRTY_BIT) &&
			(internal.flags |= DIRTY_BIT) &&
			renderQueue.push(internal) &&
			!processRenderQueue._rerenderCount++) ||
		prevDebounce !== options.debounceRendering
	) {
		prevDebounce = options.debounceRendering;
		(prevDebounce || defer)(processRenderQueue);
	}
}

/** Flush the render queue by rerendering all queued components */
function processRenderQueue() {
	while ((len = processRenderQueue._rerenderCount = renderQueue.length)) {
		renderQueue.sort((a, b) => a._depth - b._depth);
		while (len--) {
			renderDirtyInternal(renderQueue.shift());
		}
	}
}
let len = (processRenderQueue._rerenderCount = 0);
