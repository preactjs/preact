import { assign } from './util';
import { diff, commitRoot } from './diff/index';
import options from './options';
import { Fragment } from './create-element';
import { MODE_HYDRATE, NULL } from './constants';
import {
	getMountedBacking,
	getOwnedChildren,
	getOwnedFirstDom,
	getOwnedVNode,
	isBackingNode,
	replaceOwnedChild,
	setOwnedRange
} from './backing';
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
	let backing = isBackingNode(vnode) ? vnode : getMountedBacking(vnode);

	if (childIndex == NULL) {
		// Resume search from this node's next sibling in its parent's child list.
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

	let children = backing != NULL ? backing._children : NULL;
	if (children == NULL) children = getOwnedChildren(vnode) || [];
	for (; childIndex < children.length; childIndex++) {
		let sibling = children[childIndex];
		if (sibling != NULL && getFirstDom(sibling) != NULL) {
			return getFirstDom(sibling);
		}
	}

	// No DOM found in children. If this is a component/Fragment (not a DOM
	// element), climb up to the parent's sibling list.
	let vnodeRef = isBackingNode(vnode) ? vnode._vnode : vnode;
	return vnodeRef != NULL && typeof vnodeRef.type == 'function'
		? getDomSibling(backing || vnode)
		: NULL;
}

/**
 * Recompute the owned DOM range for a vnode from its rendered children.
 * @param {import('./internal').VNode} vnode
 */
export function updateVNodeDomPointers(vnode) {
	updateRangeFromChildren(vnode);
	if (vnode._component != NULL) {
		vnode._component.base = getOwnedFirstDom(vnode);
	}
}

/**
 * Trigger in-place re-rendering of a component.
 * @param {import('./internal').Component} component The component to rerender
 */
function renderComponent(component) {
	if (component._parentDom && component._dirty) {
		let oldVNode = component._vnode,
			oldDom = getOwnedFirstDom(oldVNode),
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

		diff(
			component._parentDom,
			newVNode,
			oldVNode,
			component._globalContext,
			component._parentDom.namespaceURI,
			oldVNode._flags & MODE_HYDRATE ? [oldDom] : NULL,
			commitQueue,
			hostOps,
			unmountQueue,
			removeOps,
			oldDom == NULL ? getDomSibling(oldVNode) : oldDom,
			!!(oldVNode._flags & MODE_HYDRATE),
			refQueue,
			false,
			hostOpCounts,
			childDiffStats
		);

		newVNode._original = oldVNode._original;

		// Replace this component's entry in the parent's mounted child list
		// using the backing parent chain.
		let backing = getMountedBacking(newVNode);
		if (backing != NULL && backing._parent != NULL) {
			let parentBacking = backing._parent;
			let parentChildren = parentBacking._children;
			if (parentChildren != NULL) {
				for (let j = 0; j < parentChildren.length; j++) {
					if (parentChildren[j] === backing) {
						// Backing is already updated via reuseBacking — just
						// ensure it stays in the parent's child list.
						break;
					}
				}
			}
		}

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
		setOwnedRange(oldVNode, null, null, null);

		if (getOwnedFirstDom(newVNode) != oldDom) {
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
	let backing = isBackingNode(node) ? node._parent : null;
	if (backing == NULL && node != NULL) {
		backing = getMountedBacking(node);
		if (backing != NULL) backing = backing._parent;
	}
	if (
		backing != NULL &&
		backing._vnode != NULL &&
		backing._vnode._component != NULL
	) {
		updateVNodeDomPointers(backing._vnode);
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
const depthSort = (a, b) => a._vnode._depth - b._vnode._depth;

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
