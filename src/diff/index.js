import {
	ARRAY_CHILDREN,
	EMPTY_ARR,
	EMPTY_OBJ,
	HAS_KEY,
	MATH_NAMESPACE,
	MODE_HYDRATE,
	MODE_SUSPENDED,
	NULL,
	RESET_MODE,
	SINGLE_CHILD,
	SINGLE_TEXT_CHILD,
	SVG_NAMESPACE,
	UNDEFINED,
	XHTML_NAMESPACE
} from '../constants';
import { BaseComponent, getDomSibling } from '../component';
import {
	createVNode,
	Fragment,
	setNormalizedChildFlags
} from '../create-element';
import { diffChildren } from './children';
import { setProperty } from './props';
import { assign, isArray, removeNode, slice } from '../util';
import options from '../options';
import { getAnchorDom, getFirstDom, getLastDom } from '../range';
import {
	BACKING_COMPONENT,
	BACKING_FRAGMENT,
	BACKING_HOST,
	clearBacking,
	createBacking,
	getOwnedVNode,
	isBackingNode,
	setBackingChildren
} from '../backing';

/**
 * @typedef {import('../internal').ComponentChildren} ComponentChildren
 * @typedef {import('../internal').ChildDiffStats} ChildDiffStats
 * @typedef {import('../internal').Component} Component
 * @typedef {import('../internal').HostOpCounts} HostOpCounts
 * @typedef {import('../internal').PreactElement} PreactElement
 * @typedef {import('../internal').VNode} VNode
 */

/**
 * @template {any} T
 * @typedef {import('../internal').Ref<T>} Ref<T>
 */

/**
 * Diff two virtual nodes and apply proper changes to the DOM.
 *
 * @param {PreactElement} parentDom The parent of the DOM element
 * @param {VNode} newVNode The new virtual node (descriptor)
 * @param {VNode} oldVNode The old virtual node (descriptor)
 * @param {import('../internal').BackingNode | null} oldBacking The old mounted backing node
 * @param {object} globalContext
 * @param {string} namespace
 * @param {Array<PreactElement>} excessDomChildren
 * @param {Array<Component>} commitQueue
 * @param {any[]} hostOps
 * @param {import('../internal').BackingNode[]} unmountQueue
 * @param {any[]} removeOps
 * @param {PreactElement} oldDom
 * @param {boolean} isHydrating
 * @param {any[]} refQueue
 * @param {boolean} allowInlineText
 * @param {HostOpCounts | null} hostOpCounts
 * @param {ChildDiffStats | null} childDiffStats
 * @returns {import('../internal').BackingNode | null} The new/updated backing node
 */
export function diff(
	parentDom,
	newVNode,
	oldBacking,
	globalContext,
	namespace,
	excessDomChildren,
	commitQueue,
	hostOps,
	unmountQueue,
	removeOps,
	oldDom,
	isHydrating,
	refQueue,
	allowInlineText,
	hostOpCounts,
	childDiffStats
) {
	/** @type {any} */
	let tmp,
		newType = newVNode.type,
		oldVNode = oldBacking != NULL ? oldBacking._vnode || EMPTY_OBJ : EMPTY_OBJ;

	// When passing through createElement it assigns the object
	// constructor as undefined. This to prevent JSON-injection.
	if (newVNode.constructor !== UNDEFINED) return NULL;

	// If the previous diff bailed out, resume creating/hydrating.
	if (oldVNode._flags & MODE_SUSPENDED) {
		isHydrating = !!(oldVNode._flags & MODE_HYDRATE);
		oldDom = oldBacking != NULL ? oldBacking._firstDom : NULL;
		excessDomChildren = [oldDom];
	}

	if ((tmp = options._diff)) tmp(newVNode);

	// Reuse old backing or create new. This is the mounted instance for this vnode.
	let curBacking = oldBacking;
	if (curBacking != NULL) {
		curBacking._vnode = newVNode;
	}
	if (curBacking != NULL) {
		curBacking._depth =
			curBacking._parent != NULL ? curBacking._parent._depth + 1 : 0;
	}

	outer: if (typeof newType == 'function') {
		try {
			let c, isNew, oldProps, oldState, snapshot, clearProcessingException;
			let newProps = newVNode.props;
			const isClassComponent = newType.prototype && newType.prototype.render;

			// Ensure backing exists for components
			if (curBacking == NULL) {
				curBacking = createBacking(
					newVNode,
					newVNode.type === Fragment ? BACKING_FRAGMENT : BACKING_COMPONENT
				);
			} else {
				curBacking._kind =
					newVNode.type === Fragment ? BACKING_FRAGMENT : BACKING_COMPONENT;
			}

			// Necessary for createContext api. Setting this property will pass
			// the context value as `this.context` just for this component.
			tmp = newType.contextType;
			let provider = tmp && globalContext[tmp._id];
			let componentContext = tmp
				? provider
					? provider.props.value
					: tmp._defaultValue
				: globalContext;

			// Get component from backing, not vnode
			if (curBacking._component) {
				c = curBacking._component;
				c._backing = curBacking;
				clearProcessingException = c._processingException = c._pendingError;
			} else {
				// Instantiate the new component
				if (isClassComponent) {
					// @ts-expect-error The check above verifies that newType is suppose to be constructed
					c = new newType(newProps, componentContext); // eslint-disable-line new-cap
				} else {
					// @ts-expect-error Trust me, Component implements the interface we want
					c = new BaseComponent(newProps, componentContext);
					c.constructor = newType;
					c.render = doRender;
				}
				curBacking._component = c;
				c._backing = curBacking;
				if (provider) provider.sub(c);

				if (!c.state) c.state = {};
				c._globalContext = globalContext;
				isNew = c._dirty = true;
				c._renderCallbacks = [];
				c._stateCallbacks = [];
			}

			// Invoke getDerivedStateFromProps
			if (isClassComponent && c._nextState == NULL) {
				c._nextState = c.state;
			}

			if (isClassComponent && newType.getDerivedStateFromProps != NULL) {
				if (c._nextState == c.state) {
					c._nextState = assign({}, c._nextState);
				}

				assign(
					c._nextState,
					newType.getDerivedStateFromProps(newProps, c._nextState)
				);
			}

			oldProps = c.props;
			oldState = c.state;
			c._vnode = newVNode;

			// Invoke pre-render lifecycle methods
			if (isNew) {
				if (
					isClassComponent &&
					newType.getDerivedStateFromProps == NULL &&
					c.componentWillMount != NULL
				) {
					c.componentWillMount();
				}

				if (isClassComponent && c.componentDidMount != NULL) {
					c._renderCallbacks.push(c.componentDidMount);
				}
			} else {
				if (
					isClassComponent &&
					newType.getDerivedStateFromProps == NULL &&
					newProps !== oldProps &&
					c.componentWillReceiveProps != NULL
				) {
					c.componentWillReceiveProps(newProps, componentContext);
				}

				if (
					newVNode._original == oldVNode._original ||
					(!c._force &&
						c.shouldComponentUpdate != NULL &&
						c.shouldComponentUpdate(
							newProps,
							c._nextState,
							componentContext
						) === false)
				) {
					// More info about this here: https://gist.github.com/JoviDeCroock/bec5f2ce93544d2e6070ef8e0036e4e8
					if (newVNode._original != oldVNode._original) {
						// When we are dealing with a bail because of sCU we have to update
						// the props, state and dirty-state.
						// when we are dealing with strict-equality we don't as the child could still
						// be dirtied see #3883
						c.props = newProps;
						c.state = c._nextState;
						c._dirty = false;
					}

					curBacking._firstDom = oldBacking._firstDom;
					curBacking._lastDom = oldBacking._lastDom;
					curBacking._anchorDom = oldBacking._anchorDom;
					curBacking._children = oldBacking._children;

					EMPTY_ARR.push.apply(c._renderCallbacks, c._stateCallbacks);
					c._stateCallbacks = [];

					if (c._renderCallbacks.length) {
						commitQueue.push(c);
					}

					break outer;
				}

				if (c.componentWillUpdate != NULL) {
					c.componentWillUpdate(newProps, c._nextState, componentContext);
				}

				if (isClassComponent && c.componentDidUpdate != NULL) {
					c._renderCallbacks.push(() => {
						c.componentDidUpdate(oldProps, oldState, snapshot);
					});
				}
			}

			c.context = componentContext;
			c.props = newProps;
			c._parentDom = parentDom;
			c._force = false;

			let renderHook = options._render,
				count = 0;
			if (isClassComponent) {
				c.state = c._nextState;
				c._dirty = false;

				if (renderHook) renderHook(newVNode, curBacking);

				tmp = c.render(c.props, c.state, c.context);

				EMPTY_ARR.push.apply(c._renderCallbacks, c._stateCallbacks);
				c._stateCallbacks = [];
			} else {
				do {
					c._dirty = false;
					if (renderHook) renderHook(newVNode, curBacking);

					tmp = c.render(c.props, c.state, c.context);

					// Handle setState called in render, see #2553
					c.state = c._nextState;
				} while (c._dirty && ++count < 25);
			}

			// Handle setState called in render, see #2553
			c.state = c._nextState;

			if (c.getChildContext != NULL) {
				globalContext = assign(assign({}, globalContext), c.getChildContext());
			}

			if (isClassComponent && !isNew && c.getSnapshotBeforeUpdate != NULL) {
				snapshot = c.getSnapshotBeforeUpdate(oldProps, oldState);
			}

			let renderResult =
				tmp != NULL && tmp.type === Fragment && tmp.key == NULL
					? cloneNode(tmp.props.children)
					: tmp;
			setNormalizedChildFlags(
				newVNode,
				isArray(renderResult) ? renderResult : [renderResult]
			);

			oldDom = diffChildren(
				parentDom,
				isArray(renderResult) ? renderResult : [renderResult],
				newVNode,
				globalContext,
				namespace,
				excessDomChildren,
				commitQueue,
				hostOps,
				unmountQueue,
				removeOps,
				oldDom,
				isHydrating,
				refQueue,
				hostOpCounts,
				childDiffStats,
				curBacking
			);

			let newMountedChildren = curBacking._children;
			let oldMountedChildren = oldBacking != NULL ? oldBacking._children : NULL;
			if (c._childDidSuspend && newMountedChildren) {
				let newChild0 = getOwnedVNode(newMountedChildren[0]);
				let newChild1 = getOwnedVNode(newMountedChildren[1]);
				c._primaryChild = newChild0 || NULL;
				c._fallbackChild = newChild1 || NULL;
				if (
					!(c.state && c.state._suspended) &&
					c._pendingSuspensionCount &&
					oldMountedChildren
				) {
					let oldChild0 = getOwnedVNode(oldMountedChildren[0]);
					if (oldChild0) {
						c._parkedChild = oldChild0;
					}
				}
				if (c.state && c.state._suspended) {
					c._activeChild = c._fallbackChild;
				} else if (c._pendingSuspensionCount && c._parkedChild) {
					newMountedChildren[0] = c._parkedChild;
					newMountedChildren[1] = NULL;
					c._primaryChild = c._parkedChild;
					c._fallbackChild = NULL;
					c._activeChild = c._parkedChild;
				} else {
					c._activeChild = c._primaryChild;
					c._parkedChild = NULL;
				}

				let activeChild = c._activeChild;
				if (activeChild != NULL) {
					curBacking._firstDom = getFirstDom(activeChild);
					curBacking._lastDom = getLastDom(activeChild);
					curBacking._anchorDom = getAnchorDom(activeChild);
				} else {
					curBacking._firstDom = NULL;
					curBacking._lastDom = NULL;
					curBacking._anchorDom = NULL;
				}
			}

			// Ensure backing node has correct kind for suspense/fragment/component.
			if (c._childDidSuspend) {
				curBacking._kind = 3 /* SUSPENSE */;
				curBacking._activeChild = c._activeChild || NULL;
				curBacking._parkedChild = c._parkedChild || NULL;
				curBacking._fallbackChild = c._fallbackChild || NULL;
			} else if (newVNode.type === Fragment) {
				curBacking._kind = 1 /* FRAGMENT */;
			} else {
				curBacking._kind = 2 /* COMPONENT */;
			}

			c.base = curBacking._firstDom;

			// We successfully rendered this VNode, unset any stored hydration/bailout state:
			newVNode._flags &= RESET_MODE;

			if (c._renderCallbacks.length) {
				commitQueue.push(c);
			}

			if (clearProcessingException) {
				c._pendingError = c._processingException = NULL;
			}
		} catch (e) {
			newVNode._original = NULL;
			// if hydrating or creating initial tree, bailout preserves DOM:
			if (isHydrating || excessDomChildren != NULL) {
				if (e.then) {
					newVNode._flags |= isHydrating
						? MODE_HYDRATE | MODE_SUSPENDED
						: MODE_SUSPENDED;

					while (oldDom && oldDom.nodeType == 8 && oldDom.nextSibling) {
						oldDom = oldDom.nextSibling;
					}

					excessDomChildren[excessDomChildren.indexOf(oldDom)] = NULL;
					if (curBacking == NULL) {
						curBacking = createBacking(newVNode, BACKING_COMPONENT);
					}
					curBacking._firstDom = oldDom;
					curBacking._lastDom = oldDom;
					curBacking._anchorDom = oldDom;
				} else {
					for (let i = excessDomChildren.length; i--; ) {
						removeNode(excessDomChildren[i]);
					}
					markAsForce(curBacking);
				}
			} else {
				if (curBacking == NULL) {
					curBacking = createBacking(newVNode, BACKING_COMPONENT);
				}
				if (oldBacking != NULL) {
					curBacking._firstDom = oldBacking._firstDom;
					curBacking._lastDom = oldBacking._lastDom;
					curBacking._anchorDom = oldBacking._anchorDom;
					curBacking._children = oldBacking._children;
				}
				if (!e.then) markAsForce(curBacking);
			}
			options._catchError(e, newVNode, NULL, NULL, curBacking);
		}
	} else if (
		excessDomChildren == NULL &&
		newVNode._original == oldVNode._original
	) {
		if (curBacking == NULL) {
			curBacking = createBacking(newVNode, BACKING_HOST);
		}
		if (oldBacking != NULL) {
			curBacking._children = oldBacking._children;
			curBacking._firstDom = oldBacking._firstDom;
			curBacking._lastDom = oldBacking._lastDom;
			curBacking._anchorDom = oldBacking._anchorDom;
		}
	} else {
		if (curBacking == NULL) {
			curBacking = createBacking(newVNode, BACKING_HOST);
		}
		oldDom = diffElementNodes(
			oldBacking != NULL ? oldBacking._firstDom : NULL,
			newVNode,
			oldVNode,
			globalContext,
			namespace,
			excessDomChildren,
			commitQueue,
			hostOps,
			unmountQueue,
			removeOps,
			isHydrating,
			refQueue,
			allowInlineText,
			hostOpCounts,
			childDiffStats,
			curBacking
		);
	}

	if ((tmp = options.diffed)) tmp(newVNode, curBacking);

	// Keep vnode DOM mirrors in sync while backing nodes remain the source of truth.
	if (curBacking != NULL) {
		newVNode._dom = curBacking._firstDom;
		newVNode._lastDom = curBacking._lastDom;
		newVNode._anchorDom = curBacking._anchorDom;
		curBacking._oldDom = oldDom;
	}
	return newVNode._flags & MODE_SUSPENDED ? NULL : curBacking;
}

function markAsForce(backing) {
	if (backing) {
		if (backing._component) backing._component._force = true;
		let children = backing._children;
		if (children) {
			for (let i = 0; i < children.length; i++) {
				let child = children[i];
				if (child != NULL && isBackingNode(child)) {
					markAsForce(child);
				}
			}
		}
	}
}

/**
 * @param {Array<Component>} commitQueue List of components
 * which have callbacks to invoke in commitRoot
 * @param {VNode} root
 */
export function commitRoot(
	commitQueue,
	root,
	refQueue,
	hostOps,
	unmountQueue,
	removeOps,
	hostOpCounts,
	childDiffStats
) {
	flushUnmounts(unmountQueue);
	flushRemoveOps(removeOps);
	flushHostOps(hostOps);

	for (let i = 0; i < refQueue.length; i++) {
		applyRef(refQueue[i], refQueue[++i], refQueue[++i], refQueue[++i]);
	}

	if (options._commit) options._commit(root, commitQueue);
	if (hostOpCounts != NULL && options._hostOps)
		options._hostOps(root, hostOpCounts);
	if (childDiffStats != NULL && options._childDiff)
		options._childDiff(root, childDiffStats);

	commitQueue.some(c => {
		try {
			// @ts-expect-error Reuse the commitQueue variable here so the type changes
			commitQueue = c._renderCallbacks;
			c._renderCallbacks = [];
			commitQueue.some(cb => {
				// @ts-expect-error See above comment on commitQueue
				cb.call(c);
			});
		} catch (e) {
			options._catchError(e, c._vnode, NULL, NULL, c._backing);
		}
	});
}

/**
 * @param {any[]} hostOps
 */
function flushHostOps(hostOps) {
	for (let i = 0; i < hostOps.length; ) {
		let op = hostOps[i];
		if (op === OP_SET_TEXT) {
			hostOps[i++] = NULL;
			let node = hostOps[i];
			let value = hostOps[i + 1];
			node.data = value;
			hostOps[i++] = hostOps[i++] = NULL;
		} else if (op === OP_INSERT_NODE) {
			hostOps[i++] = NULL;
			let node = hostOps[i];
			let parent = hostOps[i + 1];
			let before = resolvePlacementAnchor(hostOps[i + 2], parent);
			if ((before === node && node.parentNode === parent) || false) {
				// already in the right spot
			} else if (
				node.parentNode !== parent ||
				(before == NULL
					? node.nextSibling != NULL
					: node.nextSibling !== before)
			) {
				parent.insertBefore(node, before || NULL);
			}
			hostOps[i++] = hostOps[i++] = hostOps[i++] = NULL;
		} else if (op === OP_MOVE_RANGE) {
			hostOps[i++] = NULL;
			let first = hostOps[i];
			let last = hostOps[i + 1];
			let parent = hostOps[i + 2];
			let before = resolvePlacementAnchor(hostOps[i + 3], parent);
			if ((before === first && first.parentNode === parent) || false) {
				// already in the right spot
			} else if (
				first.parentNode !== parent ||
				(before == NULL
					? last.nextSibling != NULL
					: last.nextSibling !== before)
			) {
				moveRange(first, last, parent, before);
			}
			hostOps[i++] = hostOps[i++] = hostOps[i++] = hostOps[i++] = NULL;
		}
	}

	hostOps.length = 0;
}

function resolvePlacementAnchor(before, parent) {
	if (before != NULL && typeof before == 'object' && before.nodeType == NULL) {
		let dom = getAnchorDom(before) || getFirstDom(before);
		return dom != NULL && dom.parentNode === parent ? dom : NULL;
	}

	return before != NULL && before.parentNode === parent ? before : NULL;
}

/**
 * @param {VNode[]} unmountQueue
 * @param {VNode} root
 */
function flushUnmounts(unmountQueue) {
	for (let i = 0; i < unmountQueue.length; i++) {
		unmount(unmountQueue[i], NULL, true);
		unmountQueue[i] = NULL;
	}

	unmountQueue.length = 0;
}

/**
 * @param {any[]} removeOps
 */
function flushRemoveOps(removeOps) {
	for (let i = 0; i < removeOps.length; ) {
		let first = removeOps[i];
		let last = removeOps[i + 1];
		removeRange(first, last);
		removeOps[i++] = removeOps[i++] = NULL;
	}

	removeOps.length = 0;
}

/**
 * Move the contiguous DOM range [start..end] before `before`.
 * @param {PreactElement} start
 * @param {PreactElement} end
 * @param {PreactElement} parentDom
 * @param {PreactElement} before
 */
function moveRange(start, end, parentDom, before) {
	let node = start;
	let afterEnd = end.nextSibling;
	while (node != afterEnd) {
		let next = node.nextSibling;
		parentDom.insertBefore(node, before || NULL);
		node = next;
	}
}

/**
 * Remove the contiguous DOM range [start..end].
 * @param {PreactElement} start
 * @param {PreactElement} end
 */
function removeRange(start, end) {
	let node = start;
	let afterEnd = end.nextSibling;
	while (node != afterEnd) {
		let next = node.nextSibling;
		removeNode(node);
		node = next;
	}
}

/**
 * @param {VNode} vnode
 * @param {PreactElement} before
 * @param {PreactElement} parentDom
 * @param {any[]} hostOps
 * @param {HostOpCounts | null} hostOpCounts
 */
export function queuePlacement(
	vnode,
	before,
	parentDom,
	hostOps,
	hostOpCounts
) {
	let firstDom = getFirstDom(vnode);
	let lastDom = getLastDom(vnode);

	if (firstDom == NULL) return;

	if (before === firstDom && firstDom.parentNode === parentDom) {
		return;
	}

	if (firstDom === lastDom) {
		if (hostOpCounts != NULL) hostOpCounts.insertNode++;
		hostOps.push(OP_INSERT_NODE, firstDom, parentDom, before || NULL);
	} else if (firstDom.parentNode != NULL) {
		// Children already in DOM — move as contiguous range
		if (hostOpCounts != NULL) hostOpCounts.moveRange++;
		hostOps.push(OP_MOVE_RANGE, firstDom, lastDom, parentDom, before || NULL);
	} else {
		// Children not in DOM yet (initial Fragment mount). Walk backing
		// children and insert each individually. Recurse for nested Fragments.
		let children = vnode._children;
		if (children) {
			for (let i = 0; i < children.length; i++) {
				if (children[i] != NULL) {
					queuePlacement(children[i], before, parentDom, hostOps, hostOpCounts);
				}
			}
		}
	}
}

const OP_SET_TEXT = 1;
const OP_INSERT_NODE = 2;
const OP_MOVE_RANGE = 3;

function cloneNode(node) {
	if (typeof node != 'object' || node == NULL || node._parent != NULL) {
		return node;
	}

	if (isArray(node)) {
		return node.map(cloneNode);
	}

	return assign({}, node);
}

function canFastDiffTextChild(
	newVNode,
	oldVNode,
	newProps,
	oldProps,
	newChildren,
	excessDomChildren,
	isHydrating,
	curBacking
) {
	let oldOwnedChildren = curBacking._children;
	let oldChild0 =
		oldOwnedChildren != NULL ? getOwnedVNode(oldOwnedChildren[0]) : NULL;
	if (
		isHydrating ||
		excessDomChildren != NULL ||
		(newVNode._flags & SINGLE_TEXT_CHILD) == 0 ||
		(newVNode._flags & HAS_KEY) != 0 ||
		(newVNode._flags & ARRAY_CHILDREN) != 0 ||
		(oldVNode._flags & SINGLE_TEXT_CHILD) == 0 ||
		oldOwnedChildren == NULL ||
		oldOwnedChildren.length !== 1 ||
		oldChild0 == NULL ||
		oldChild0.type != NULL
	) {
		return false;
	}

	if (newChildren == NULL || typeof newChildren == 'boolean') {
		return false;
	}

	for (let i in newProps) {
		if (
			i != 'children' &&
			i != 'value' &&
			i != 'checked' &&
			oldProps[i] !== newProps[i]
		) {
			return false;
		}
	}

	for (let i in oldProps) {
		if (i != 'children' && i != 'value' && i != 'checked' && !(i in newProps)) {
			return false;
		}
	}

	return true;
}

function canBailHostSubtree(
	newVNode,
	oldVNode,
	newProps,
	oldProps,
	newChildren,
	excessDomChildren,
	isHydrating,
	curBacking
) {
	let oldOwnedCh = curBacking._children;
	if (
		isHydrating ||
		excessDomChildren != NULL ||
		oldOwnedCh == NULL ||
		newProps.dangerouslySetInnerHTML != NULL ||
		oldProps.dangerouslySetInnerHTML != NULL ||
		newProps.value !== UNDEFINED ||
		oldProps.value !== UNDEFINED ||
		newProps.checked !== UNDEFINED ||
		oldProps.checked !== UNDEFINED ||
		newProps.contentEditable != NULL ||
		oldProps.contentEditable != NULL
	) {
		return false;
	}

	for (let i in newProps) {
		if (i != 'children' && oldProps[i] !== newProps[i]) {
			return false;
		}
	}

	for (let i in oldProps) {
		if (i != 'children' && !(i in newProps)) {
			return false;
		}
	}

	return areChildrenStructurallyEqual(newVNode._flags, newChildren, oldOwnedCh);
}

function areChildrenStructurallyEqual(childFlags, newChildren, oldChildren) {
	if ((childFlags & SINGLE_TEXT_CHILD) != 0) {
		let oc0 = oldChildren.length === 1 ? getOwnedVNode(oldChildren[0]) : NULL;
		return oc0 != NULL && oc0.type == NULL && oc0.props === newChildren;
	}

	if ((childFlags & SINGLE_CHILD) != 0) {
		let oldChild0 = oldChildren[0];
		let oldChild0Backing = isBackingNode(oldChild0) ? oldChild0 : NULL;
		return (
			oldChildren.length === 1 &&
			isStructurallyEqualChild(
				newChildren,
				getOwnedVNode(oldChild0),
				oldChild0Backing
			)
		);
	}

	if ((childFlags & ARRAY_CHILDREN) != 0) {
		if (!isArray(newChildren) || newChildren.length !== oldChildren.length) {
			return false;
		}

		for (let i = 0; i < newChildren.length; i++) {
			let oldChild = oldChildren[i];
			let oldChildBacking = isBackingNode(oldChild) ? oldChild : NULL;
			if (
				!isStructurallyEqualChild(
					newChildren[i],
					getOwnedVNode(oldChild),
					oldChildBacking
				)
			) {
				return false;
			}
		}

		return true;
	}

	return oldChildren.length === 0;
}

function isStructurallyEqualChild(rawChild, oldVNode, oldBacking) {
	if (
		rawChild == NULL ||
		typeof rawChild == 'boolean' ||
		typeof rawChild == 'function'
	) {
		return oldVNode == NULL;
	}

	if (
		typeof rawChild == 'string' ||
		typeof rawChild == 'number' ||
		typeof rawChild == 'bigint' ||
		rawChild.constructor == String
	) {
		return (
			oldVNode != NULL && oldVNode.type == NULL && oldVNode.props === rawChild
		);
	}

	if (isArray(rawChild)) return false;

	if (
		oldVNode == NULL ||
		rawChild.type !== oldVNode.type ||
		rawChild.key !== oldVNode.key ||
		rawChild.ref !== oldVNode.ref
	) {
		return false;
	}

	let newProps = rawChild.props || EMPTY_OBJ;
	let oldProps = oldVNode.props || EMPTY_OBJ;
	if (
		newProps.dangerouslySetInnerHTML != NULL ||
		oldProps.dangerouslySetInnerHTML != NULL ||
		newProps.value !== UNDEFINED ||
		oldProps.value !== UNDEFINED ||
		newProps.checked !== UNDEFINED ||
		oldProps.checked !== UNDEFINED ||
		newProps.contentEditable != NULL ||
		oldProps.contentEditable != NULL
	) {
		return false;
	}

	for (let i in newProps) {
		if (i != 'children' && oldProps[i] !== newProps[i]) {
			return false;
		}
	}

	for (let i in oldProps) {
		if (i != 'children' && !(i in newProps)) {
			return false;
		}
	}

	return areChildrenStructurallyEqual(
		rawChild._flags,
		newProps.children,
		(oldBacking != NULL ? oldBacking._children : NULL) || EMPTY_ARR
	);
}

function createTextVNode(value, parentVNode) {
	let vnode = createVNode(NULL, value, NULL, NULL, NULL);
	vnode._parent = parentVNode;
	vnode._index = 0;
	return vnode;
}

/**
 * Diff two virtual nodes representing DOM element
 * @param {PreactElement} dom The DOM element representing the virtual nodes
 * being diffed
 * @param {VNode} newVNode The new virtual node
 * @param {VNode} oldVNode The old virtual node
 * @param {object} globalContext The current context object
 * @param {string} namespace Current namespace of the DOM node (HTML, SVG, or MathML)
 * @param {Array<PreactElement>} excessDomChildren
 * @param {Array<Component>} commitQueue List of components which have callbacks
 * to invoke in commitRoot
 * @param {any[]} hostOps
 * @param {VNode[]} unmountQueue
 * @param {any[]} removeOps
 * @param {boolean} isHydrating Whether or not we are in hydration
 * @param {any[]} refQueue an array of elements needed to invoke refs
 * @param {boolean} allowInlineText Whether text writes can be applied inline
 * @param {HostOpCounts | null} hostOpCounts
 * @param {ChildDiffStats | null} childDiffStats
 * @param {import('../internal').BackingNode} curBacking The backing node for this element
 * @returns {PreactElement}
 */
function diffElementNodes(
	dom,
	newVNode,
	oldVNode,
	globalContext,
	namespace,
	excessDomChildren,
	commitQueue,
	hostOps,
	unmountQueue,
	removeOps,
	isHydrating,
	refQueue,
	allowInlineText,
	hostOpCounts,
	childDiffStats,
	curBacking
) {
	let oldProps = oldVNode.props || EMPTY_OBJ;
	let newProps = newVNode.props;
	let nodeType = /** @type {string} */ (newVNode.type);
	/** @type {any} */
	let i;
	/** @type {{ __html?: string }} */
	let newHtml;
	/** @type {{ __html?: string }} */
	let oldHtml;
	/** @type {ComponentChildren} */
	let newChildren;
	let value;
	let inputValue;
	let checked;

	// Tracks entering and exiting namespaces when descending through the tree.
	if (nodeType == 'svg') namespace = SVG_NAMESPACE;
	else if (nodeType == 'math') namespace = MATH_NAMESPACE;
	else if (!namespace) namespace = XHTML_NAMESPACE;

	if (excessDomChildren != NULL) {
		for (i = 0; i < excessDomChildren.length; i++) {
			value = excessDomChildren[i];

			// if newVNode matches an element in excessDomChildren or the `dom`
			// argument matches an element in excessDomChildren, remove it from
			// excessDomChildren so it isn't later removed in diffChildren
			if (
				value &&
				'setAttribute' in value == !!nodeType &&
				(nodeType ? value.localName == nodeType : value.nodeType == 3)
			) {
				dom = value;
				excessDomChildren[i] = NULL;
				break;
			}
		}
	}

	if (dom == NULL) {
		if (nodeType == NULL) {
			dom = document.createTextNode(newProps);
			curBacking._firstDom = dom;
			curBacking._lastDom = dom;
			curBacking._anchorDom = dom;
			return dom;
		}

		dom = document.createElementNS(
			namespace,
			nodeType,
			newProps.is && newProps
		);

		// we are creating a new node, so we can assume this is a new subtree (in
		// case we are hydrating), this deopts the hydrate
		if (isHydrating) {
			if (options._hydrationMismatch)
				options._hydrationMismatch(newVNode, excessDomChildren);
			isHydrating = false;
		}
		// we created a new parent, so none of the previously attached children can be reused:
		excessDomChildren = NULL;
	}

	if (nodeType == NULL) {
		// During hydration, we still have to split merged text from SSR'd HTML.
		if (oldProps !== newProps && (!isHydrating || dom.data != newProps)) {
			if (allowInlineText || isHydrating || curBacking._firstDom == NULL) {
				dom.data = newProps;
			} else {
				if (hostOpCounts != NULL) hostOpCounts.setText++;
				hostOps.push(OP_SET_TEXT, dom, newProps);
			}
		}
		curBacking._firstDom = dom;
		curBacking._lastDom = dom;
		curBacking._anchorDom = dom;
	} else {
		// If excessDomChildren was not null, repopulate it with the current element's children:
		excessDomChildren = excessDomChildren && slice.call(dom.childNodes);

		// If we are in a situation where we are not hydrating but are using
		// existing DOM (e.g. replaceNode) we should read the existing DOM
		// attributes to diff them
		if (!isHydrating && excessDomChildren != NULL) {
			oldProps = {};
			for (i = 0; i < dom.attributes.length; i++) {
				value = dom.attributes[i];
				oldProps[value.name] = value.value;
			}
		}

		for (i in oldProps) {
			value = oldProps[i];
			if (i == 'dangerouslySetInnerHTML') {
				oldHtml = value;
			} else if (
				i != 'children' &&
				!(i in newProps) &&
				!(i == 'value' && 'defaultValue' in newProps) &&
				!(i == 'checked' && 'defaultChecked' in newProps)
			) {
				setProperty(dom, i, NULL, value, namespace);
			}
		}

		// During hydration, props are not diffed at all (including dangerouslySetInnerHTML)
		// @TODO we should warn in debug mode when props don't match here.
		for (i in newProps) {
			value = newProps[i];
			if (i == 'children') {
				newChildren = value;
			} else if (i == 'dangerouslySetInnerHTML') {
				newHtml = value;
			} else if (i == 'value') {
				inputValue = value;
			} else if (i == 'checked') {
				checked = value;
			} else if (
				(!isHydrating || typeof value == 'function') &&
				oldProps[i] !== value
			) {
				setProperty(dom, i, value, oldProps[i], namespace);
			}
		}

		// If the new vnode didn't have dangerouslySetInnerHTML, diff its children
		if (newHtml) {
			// Avoid re-applying the same '__html' if it did not changed between re-render
			if (
				!isHydrating &&
				(!oldHtml ||
					(newHtml.__html != oldHtml.__html && newHtml.__html != dom.innerHTML))
			) {
				dom.innerHTML = newHtml.__html;
			}

			setBackingChildren(curBacking, []);
		} else {
			if (oldHtml) dom.innerHTML = '';
			if (
				canFastDiffTextChild(
					newVNode,
					oldVNode,
					newProps,
					oldProps,
					newChildren,
					excessDomChildren,
					isHydrating,
					curBacking
				)
			) {
				let oldTextChild = curBacking._children[0];
				let oldTextBacking = isBackingNode(oldTextChild) ? oldTextChild : NULL;
				let textVNode = createTextVNode(newChildren, newVNode);
				let textBacking = diff(
					// @ts-expect-error
					newVNode.type == 'template' ? dom.content : dom,
					textVNode,
					oldTextBacking,
					globalContext,
					nodeType == 'foreignObject' ? XHTML_NAMESPACE : namespace,
					excessDomChildren,
					commitQueue,
					hostOps,
					unmountQueue,
					removeOps,
					oldTextBacking != NULL ? oldTextBacking._firstDom : NULL,
					isHydrating,
					refQueue,
					true,
					hostOpCounts,
					childDiffStats
				);
				setBackingChildren(curBacking, [textBacking || textVNode]);
			} else if (
				canBailHostSubtree(
					newVNode,
					oldVNode,
					newProps,
					oldProps,
					newChildren,
					excessDomChildren,
					isHydrating,
					curBacking
				)
			) {
				// Children are reused — no reparenting needed,
				// backing._parent is already correct via setBackingChildren.
				curBacking._firstDom = dom;
				curBacking._lastDom = getLastDom(curBacking) || dom;
				curBacking._anchorDom = getAnchorDom(curBacking) || dom;
			} else {
				setNormalizedChildFlags(
					newVNode,
					isArray(newChildren) ? newChildren : [newChildren]
				);
				diffChildren(
					// @ts-expect-error
					newVNode.type == 'template' ? dom.content : dom,
					isArray(newChildren) ? newChildren : [newChildren],
					newVNode,
					globalContext,
					nodeType == 'foreignObject' ? XHTML_NAMESPACE : namespace,
					excessDomChildren,
					commitQueue,
					hostOps,
					unmountQueue,
					removeOps,
					excessDomChildren
						? excessDomChildren[0]
						: curBacking._children && getDomSibling(curBacking, 0),
					isHydrating,
					refQueue,
					hostOpCounts,
					childDiffStats,
					curBacking
				);
			}

			// Remove children that are not part of any vnode.
			if (excessDomChildren != NULL) {
				for (i = excessDomChildren.length; i--; ) {
					removeNode(excessDomChildren[i]);
				}
			}
		}

		// As above, don't diff props during hydration
		if (!isHydrating) {
			i = 'value';
			if (nodeType == 'progress' && inputValue == NULL) {
				dom.removeAttribute('value');
			} else if (
				inputValue != UNDEFINED &&
				// #2756 For the <progress>-element the initial value is 0,
				// despite the attribute not being present. When the attribute
				// is missing the progress bar is treated as indeterminate.
				// To fix that we'll always update it when it is 0 for progress elements
				(inputValue !== dom[i] ||
					(nodeType == 'progress' && !inputValue) ||
					// This is only for IE 11 to fix <select> value not being updated.
					// To avoid a stale select value we need to set the option.value
					// again, which triggers IE11 to re-evaluate the select value
					(nodeType == 'option' && inputValue != oldProps[i]))
			) {
				setProperty(dom, i, inputValue, oldProps[i], namespace);
			}

			i = 'checked';
			if (checked != UNDEFINED && checked != dom[i]) {
				setProperty(dom, i, checked, oldProps[i], namespace);
			}
		}

		curBacking._firstDom = dom;
		curBacking._lastDom = dom;
		curBacking._anchorDom = dom;
	}

	return dom;
}

/**
 * Invoke or update a ref, depending on whether it is a function or object ref.
 * @param {Ref<any> & { _unmount?: unknown }} ref
 * @param {any} value
 * @param {VNode} vnode
 */
export function applyRef(ref, value, vnode, backing) {
	try {
		if (typeof ref == 'function') {
			let hasRefUnmount = typeof ref._unmount == 'function';
			if (hasRefUnmount) {
				// @ts-ignore TS doesn't like moving narrowing checks into variables
				ref._unmount();
			}

			if (!hasRefUnmount || value != NULL) {
				ref._unmount = ref(value);
			}
		} else ref.current = value;
	} catch (e) {
		options._catchError(e, vnode, NULL, NULL, backing);
	}
}

/**
 * Unmount a virtual node from the tree and apply DOM changes
 * @param {VNode} vnode The virtual node to unmount
 * @param {import('../internal').BackingNode} unmountBacking The backing node
 * @param {VNode} parentVNode The parent of the VNode that initiated the unmount
 * @param {boolean} [skipRemove] Flag that indicates that a parent node of the
 * current element is already detached from the DOM.
 */
export function unmount(backing, parentBacking, skipRemove) {
	let r;
	if (!isBackingNode(backing)) return;
	let vnode = backing._vnode;

	if (options.unmount) options.unmount(vnode, backing);

	if (vnode && (r = vnode.ref)) {
		if (!r.current || r.current == backing._firstDom) {
			applyRef(r, NULL, vnode, backing);
		}
	}

	if ((r = backing._component) != NULL) {
		if (r.componentWillUnmount) {
			try {
				r.componentWillUnmount();
			} catch (e) {
				options._catchError(e, vnode, NULL, NULL, backing);
			}
		}

		r.base = r._parentDom = NULL;
	}

	if ((r = backing._children)) {
		for (let i = 0; i < r.length; i++) {
			let child = r[i];
			if (child != NULL) {
				unmount(
					child,
					backing,
					skipRemove || (vnode != NULL && typeof vnode.type != 'function')
				);
			}
		}
	}

	if (!skipRemove) {
		removeNode(backing._firstDom);
	}

	clearBacking(backing);
}

/** The `.render()` method for a PFC backing instance. */
function doRender(props, state, context) {
	return this.constructor(props, context);
}
