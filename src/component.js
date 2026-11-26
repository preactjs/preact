import {
	COMPONENT_DIRTY,
	COMPONENT_FORCE,
	MODE_HYDRATE,
	NULL,
	VNODE_MARKER
} from './constants';
import { Fragment } from './create-element';
import { commitRoot, diff } from './diff/index';
import options from './options';
import { assign } from './util';

/**
 * Base Component class. Provides `setState()` and `forceUpdate()`, which
 * trigger rendering
 * @param {object} props The initial component props
 * @param {object} context The initial context from parent components'
 * getChildContext
 */
export function BaseComponent(props, context) {
	this.props = props;
	this.context = context;
	this._bits = 0;
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
BaseComponent.prototype.setState = function (update, callback) {
	// only clone state when copying to nextState the first time.
	let s = this._nextState;
	if (!s || s == this.state) {
		s = this._nextState = assign({}, this.state);
	}

	if (typeof update == 'function') {
		// Some libraries like `immer` mark the current state as readonly,
		// preventing us from mutating it, so we need to clone it. See #2716
		update = update(assign({}, s), this.props);
	}

	if (update) {
		assign(s, update);
	} else {
		return;
	}

	if (this._vnode) {
		if (callback) {
			this._stateCallbacks.push(callback);
		}
		enqueueRender(this);
	}
};

/**
 * Immediately perform a synchronous re-render of the component
 * @this {import('./internal').Component}
 * @param {() => void} [callback] A function to be called after component is
 * re-rendered
 */
BaseComponent.prototype.forceUpdate = function (callback) {
	if (this._vnode) {
		// Set render mode so that we can differentiate where the render request
		// is coming from. We need this because forceUpdate should never call
		// shouldComponentUpdate
		this._bits |= COMPONENT_FORCE;
		if (callback) this._renderCallbacks.push(callback);
		enqueueRender(this);
	}
};

/**
 * Accepts `props` and `state`, and returns a new Virtual DOM tree to build.
 * Virtual DOM is generally constructed via [JSX](https://jasonformat.com/wtf-is-jsx).
 * @param {object} props Props (eg: JSX attributes) received from parent
 * element/component
 * @param {object} state The component's current state
 * @param {object} context Context object, as returned by the nearest
 * ancestor's `getChildContext()`
 * @returns {ComponentChildren | void}
 */
BaseComponent.prototype.render = Fragment;

/**
 * @param {import('./internal').VNode} vnode
 * @param {number | null} [childIndex] Child to start at. When omitted, search
 * the siblings following vnode.
 */
export function getDomSibling(vnode, childIndex) {
	if (childIndex != NULL) {
		let sibling;
		for (; childIndex < vnode._children.length; childIndex++) {
			sibling = vnode._children[childIndex];

			if (sibling && sibling._dom) {
				// _dom is the first DOM node rendered by this subtree.
				return sibling._dom;
			}
		}

		// DOM elements and portals bound the sibling search.
		if (typeof vnode.type != 'function' || vnode.props._parentDom) return NULL;
	}
	return vnode._parent && getDomSibling(vnode._parent, vnode._index + 1);
}

/**
 * The render queue
 * @type {Array<import('./internal').Component>}
 */
const rerenderQueue = [];

/*
 * The value of `Component.debounce` must asynchronously invoke the passed in callback. It is
 * important that contributors to Preact can consistently reason about what calls to `setState`, etc.
 * do, and when their effects will be applied. See the links below for some further reading on designing
 * asynchronous APIs.
 * * [Designing APIs for Asynchrony](https://blog.izs.me/2013/08/designing-apis-for-asynchrony)
 * * [Callbacks synchronous and asynchronous](https://blog.ometer.com/2011/07/24/callbacks-synchronous-and-asynchronous/)
 */

let prevDebounce,
	rerenderCount = 0;

export function resetRenderCount() {
	rerenderCount = 0;
}

/**
 * Enqueue a rerender of a component
 * @param {import('./internal').Component} c The component to rerender
 */
export function enqueueRender(c) {
	if (
		(!(c._bits & COMPONENT_DIRTY) &&
			((c._bits |= COMPONENT_DIRTY),
			rerenderQueue.push(c),
			!rerenderCount++)) ||
		prevDebounce != options.debounceRendering
	) {
		prevDebounce = options.debounceRendering;
		(prevDebounce || queueMicrotask)(process);
	}
}

/**
 * @param {import('./internal').Component} a
 * @param {import('./internal').Component} b
 */
const depthSort = (a, b) => a._vnode._depth - b._vnode._depth;

/** Flush the render queue by rerendering all queued components */
function process() {
	try {
		let c,
			l = 1,
			oldVNode,
			newVNode,
			oldDom,
			parentDom,
			commitQueue,
			refQueue;

		// Don't update `renderCount` yet. Keep its value non-zero to prevent unnecessary
		// process() calls from getting scheduled while `queue` is still being consumed.
		while (rerenderQueue.length) {
			// Keep the rerender queue sorted by (depth, insertion order). The queue
			// will initially be sorted on the first iteration only if it has more than 1 item.
			//
			// New items can be added to the queue e.g. when rerendering a provider, so we want to
			// keep the order from top to bottom with those new items so we can handle them in a
			// single pass
			if (rerenderQueue.length > l) {
				rerenderQueue.sort(depthSort);
			}

			c = rerenderQueue.shift();
			l = rerenderQueue.length;

			// Re-render the component in place, unless it was unmounted.
			if (c._bits & COMPONENT_DIRTY && (parentDom = c._parentDom)) {
				oldVNode = c._vnode;
				oldDom = oldVNode._dom;
				commitQueue = [];
				refQueue = [];
				newVNode = assign({ constructor: VNODE_MARKER }, oldVNode);
				newVNode._original = oldVNode._original + 1;
				if (options.vnode) options.vnode(newVNode);

				diff(
					parentDom,
					newVNode,
					oldVNode,
					c._globalContext,
					parentDom.namespaceURI,
					oldVNode._flags & MODE_HYDRATE ? [oldDom] : NULL,
					commitQueue,
					oldDom || getDomSibling(oldVNode),
					oldVNode._flags & MODE_HYDRATE,
					refQueue
				);

				newVNode._original = oldVNode._original;
				newVNode._parent._children[newVNode._index] = newVNode;
				commitRoot(commitQueue, newVNode, refQueue);
				oldVNode._parent = oldVNode._dom = NULL;

				// Stop at root boundaries (_parentDom)
				if (newVNode._dom != oldDom) {
					while (
						(newVNode = newVNode._parent) &&
						newVNode._component &&
						!newVNode.props._parentDom
					) {
						// _dom starts nulled, so re-assigning a null child._dom is a no-op and
						// the first truthy _dom stops the walk.
						newVNode._dom = NULL;
						newVNode._children.some(
							child => child && (newVNode._dom = child._dom)
						);
					}
				}
			}
		}
	} finally {
		if ((rerenderCount = rerenderQueue.length)) {
			(prevDebounce || queueMicrotask)(process);
		}
	}
}
