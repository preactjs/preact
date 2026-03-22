import { assign } from './util';
import { diff, commitRoot } from './diff/index';
import options from './options';
import { Fragment } from './create-element';
import { MODE_HYDRATE, NULL } from './constants';
import { getOwnedVNode, isBackingNode } from './backing';
import { getFirstDom, updateRangeFromChildren } from './range';

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
	let s;
	if (this._nextState != NULL && this._nextState != this.state) {
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
	if (update == NULL) return;

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
		this._force = true;
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
 * Find the next DOM sibling after a vnode's subtree by walking the backing
 * tree. Uses backing._parent and backing._children for traversal.
 *
 * @param {import('./internal').VNode | import('./internal').BackingNode} vnode
 * @param {number | null} [childIndex]
 */
export function getDomSibling(vnode, childIndex) {
	let backing = isBackingNode(vnode) ? vnode : NULL;

	if (childIndex == NULL) {
		if (backing == NULL || backing._parent == NULL) return NULL;

		let parentBacking = backing._parent;
		let parentChildren = parentBacking._children;
		if (parentChildren != NULL) {
			for (let j = 0; j < parentChildren.length; j++) {
				if (parentChildren[j] === backing) {
					return getDomSibling(parentBacking, j + 1);
				}
			}
		}
		return NULL;
	}

	let children = backing != NULL ? backing._children : [];
	for (; childIndex < children.length; childIndex++) {
		let sibling = children[childIndex];
		if (sibling != NULL && getFirstDom(sibling) != NULL) {
			return getFirstDom(sibling);
		}
	}

	let vnodeRef = isBackingNode(vnode) ? vnode._vnode : vnode;
	return vnodeRef != NULL && typeof vnodeRef.type == 'function'
		? getDomSibling(backing || vnode)
		: NULL;
}

/**
 * Recompute the owned DOM range for a vnode from its rendered children.
 * @param {import('./internal').VNode} vnode
 */
export function updateVNodeDomPointers(backing) {
	if (!isBackingNode(backing)) return;
	updateRangeFromChildren(backing);
	if (backing._component != NULL) {
		backing._component.base = backing._firstDom;
	}
}

/**
 * Trigger in-place re-rendering of a component.
 * @param {import('./internal').Component} component The component to rerender
 */
function renderComponent(component) {
	if (component._parentDom && component._dirty) {
		let oldVNode = component._vnode,
			oldBacking = component._backing,
			oldDom = oldBacking ? oldBacking._firstDom : NULL,
			commitQueue = [],
			refQueue = [],
			hostOps = [],
			unmountQueue = [],
			removeOps = [],
			childDiffStats = options._childDiff
				? {
						fastSingleText: 0,
						normalizedText: 0,
						normalizedArray: 0,
						clonedVNode: 0,
						matchedByIndex: 0,
						matchedBySearch: 0,
						searches: 0,
						mounts: 0,
						moved: 0,
						forcedPlacement: 0,
						removals: 0,
						placementPasses: 0
					}
				: null,
			hostOpCounts = options._hostOps
				? { setText: 0, insertNode: 0, moveRange: 0, removeRange: 0 }
				: null,
			newVNode = assign({}, oldVNode);
		newVNode._original = oldVNode._original + 1;
		if (options.vnode) options.vnode(newVNode);

		let backing = diff(
			component._parentDom,
			newVNode,
			oldBacking,
			component._globalContext,
			component._parentDom.namespaceURI,
			oldVNode && oldVNode._flags & MODE_HYDRATE ? [oldDom] : NULL,
			commitQueue,
			hostOps,
			unmountQueue,
			removeOps,
			oldDom == NULL ? getDomSibling(oldBacking) : oldDom,
			!!(oldVNode && oldVNode._flags & MODE_HYDRATE),
			refQueue,
			false,
			hostOpCounts,
			childDiffStats
		);

		newVNode._original = oldVNode._original;

		commitRoot(
			commitQueue,
			newVNode,
			refQueue,
			hostOps,
			unmountQueue,
			removeOps,
			hostOpCounts,
			childDiffStats
		);

		if (backing != NULL && backing._firstDom != oldDom) {
			updateParentDomPointers(backing);
		}
	}
}

/**
 * Walk the backing parent chain and update DOM range pointers for
 * component ancestors.
 * @param {import('./internal').BackingNode | import('./internal').VNode | null} node
 */
function updateParentDomPointers(node) {
	let backing = isBackingNode(node) ? node._parent : NULL;
	if (backing != NULL && backing._component != NULL) {
		updateVNodeDomPointers(backing);
		return updateParentDomPointers(backing);
	}
}

/**
 * The render queue
 * @type {Array<import('./internal').Component>}
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

const defer =
	typeof Promise == 'function'
		? Promise.prototype.then.bind(Promise.resolve())
		: setTimeout;

/**
 * Enqueue a rerender of a component
 * @param {import('./internal').Component} c The component to rerender
 */
export function enqueueRender(c) {
	if (
		(!c._dirty &&
			(c._dirty = true) &&
			rerenderQueue.push(c) &&
			!process._rerenderCount++) ||
		prevDebounce != options.debounceRendering
	) {
		prevDebounce = options.debounceRendering;
		(prevDebounce || defer)(process);
	}
}

/**
 * @param {import('./internal').Component} a
 * @param {import('./internal').Component} b
 */
const depthSort = (a, b) => a._backing._depth - b._backing._depth;

/** Flush the render queue by rerendering all queued components */
function process() {
	try {
		let c,
			l = 1;

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

			renderComponent(c);
		}
	} finally {
		rerenderQueue.length = process._rerenderCount = 0;
	}
}

process._rerenderCount = 0;
