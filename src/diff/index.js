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
import { createVNode, Fragment } from '../create-element';
import { diffChildren } from './children';
import { setProperty } from './props';
import { assign, isArray, removeNode, slice } from '../util';
import options from '../options';
import {
	getAnchorDom,
	getFirstDom,
	getLastDom,
	syncBackingOwnership
} from '../range';
import {
	clearBacking,
	getOwnedChildren,
	getOwnedFirstDom,
	getOwnedVChildren,
	reuseBacking,
	setOwnedChildren,
	setOwnedRange
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
 * Diff two virtual nodes and apply proper changes to the DOM
 * @param {PreactElement} parentDom The parent of the DOM element
 * @param {VNode} newVNode The new virtual node
 * @param {VNode} oldVNode The old virtual node
 * @param {object} globalContext The current context object. Modified by
 * getChildContext
 * @param {string} namespace Current namespace of the DOM node (HTML, SVG, or MathML)
 * @param {Array<PreactElement>} excessDomChildren
 * @param {Array<Component>} commitQueue List of components which have callbacks
 * to invoke in commitRoot
 * @param {any[]} hostOps
 * @param {VNode[]} unmountQueue
 * @param {any[]} removeOps
 * @param {PreactElement} oldDom The current attached DOM element any new dom
 * elements should be placed around. Likely `null` on first render (except when
 * hydrating). Can be a sibling DOM element when diffing Fragments that have
 * siblings. In most cases, it starts out as `oldChildren[0]._dom`.
 * @param {boolean} isHydrating Whether or not we are in hydration
 * @param {any[]} refQueue an array of elements needed to invoke refs
 * @param {boolean} allowInlineText Whether text writes can be applied inline
 * @param {HostOpCounts | null} hostOpCounts
 * @param {ChildDiffStats | null} childDiffStats
 */
export function diff(
	parentDom,
	newVNode,
	oldVNode,
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
		newType = newVNode.type;

	// When passing through createElement it assigns the object
	// constructor as undefined. This to prevent JSON-injection.
	if (newVNode.constructor !== UNDEFINED) return NULL;

	// If the previous diff bailed out, resume creating/hydrating.
	if (oldVNode._flags & MODE_SUSPENDED) {
		isHydrating = !!(oldVNode._flags & MODE_HYDRATE);
		oldDom = getOwnedFirstDom(oldVNode);
		reuseBacking(newVNode, oldVNode);
		setOwnedRange(
			newVNode,
			oldDom,
			getLastDom(oldVNode),
			getAnchorDom(oldVNode)
		);
		excessDomChildren = [oldDom];
	}

	if ((tmp = options._diff)) tmp(newVNode);

	if (oldVNode !== EMPTY_OBJ) {
		reuseBacking(newVNode, oldVNode);
	}

	outer: if (typeof newType == 'function') {
		try {
			let c, isNew, oldProps, oldState, snapshot, clearProcessingException;
			let newProps = newVNode.props;
			const isClassComponent = newType.prototype && newType.prototype.render;

			// Necessary for createContext api. Setting this property will pass
			// the context value as `this.context` just for this component.
			tmp = newType.contextType;
			let provider = tmp && globalContext[tmp._id];
			let componentContext = tmp
				? provider
					? provider.props.value
					: tmp._defaultValue
				: globalContext;

			// Get component and set it to `c`
			if (oldVNode._component) {
				c = newVNode._component = oldVNode._component;
				clearProcessingException = c._processingException = c._pendingError;
			} else {
				// Instantiate the new component
				if (isClassComponent) {
					// @ts-expect-error The check above verifies that newType is suppose to be constructed
					newVNode._component = c = new newType(newProps, componentContext); // eslint-disable-line new-cap
				} else {
					// @ts-expect-error Trust me, Component implements the interface we want
					newVNode._component = c = new BaseComponent(
						newProps,
						componentContext
					);
					c.constructor = newType;
					c.render = doRender;
				}
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

					setOwnedRange(
						newVNode,
						getOwnedFirstDom(oldVNode),
						getLastDom(oldVNode),
						getAnchorDom(oldVNode)
					);
					setOwnedChildren(newVNode, getOwnedChildren(oldVNode));
					let reusedChildren = getOwnedVChildren(newVNode);
					if (reusedChildren) {
						reusedChildren.some(vnode => {
							if (vnode) vnode._parent = newVNode;
						});
					}

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

				if (renderHook) renderHook(newVNode);

				tmp = c.render(c.props, c.state, c.context);

				EMPTY_ARR.push.apply(c._renderCallbacks, c._stateCallbacks);
				c._stateCallbacks = [];
			} else {
				do {
					c._dirty = false;
					if (renderHook) renderHook(newVNode);

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

			oldDom = diffChildren(
				parentDom,
				isArray(renderResult) ? renderResult : [renderResult],
				newVNode,
				oldVNode,
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
				childDiffStats
			);

			let newChildrenList = getOwnedVChildren(newVNode);
			let oldChildrenList = getOwnedVChildren(oldVNode);
			if (c._childDidSuspend && newChildrenList) {
				c._primaryChild = newChildrenList[0] || NULL;
				c._fallbackChild = newChildrenList[1] || NULL;
				if (
					!(c.state && c.state._suspended) &&
					c._pendingSuspensionCount &&
					oldChildrenList &&
					oldChildrenList[0]
				) {
					c._parkedChild = oldChildrenList[0];
				}
				if (c.state && c.state._suspended) {
					c._activeChild = c._fallbackChild;
				} else if (c._pendingSuspensionCount && c._parkedChild) {
					newChildrenList[0] = c._parkedChild;
					newChildrenList[1] = NULL;
					c._primaryChild = c._parkedChild;
					c._fallbackChild = NULL;
					c._activeChild = c._parkedChild;
				} else {
					c._activeChild = c._primaryChild;
					c._parkedChild = NULL;
				}

				let activeChild = c._activeChild;
				if (activeChild != NULL) {
					setOwnedRange(
						newVNode,
						getFirstDom(activeChild),
						getLastDom(activeChild),
						getAnchorDom(activeChild)
					);
				} else {
					setOwnedRange(newVNode, NULL, NULL, NULL);
				}
			}

			syncBackingOwnership(newVNode);

			c.base = getOwnedFirstDom(newVNode);

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
					setOwnedRange(newVNode, oldDom, oldDom, oldDom);
				} else {
					for (let i = excessDomChildren.length; i--; ) {
						removeNode(excessDomChildren[i]);
					}
					markAsForce(newVNode);
				}
			} else {
				setOwnedRange(
					newVNode,
					getOwnedFirstDom(oldVNode),
					getLastDom(oldVNode),
					getAnchorDom(oldVNode)
				);
				setOwnedChildren(newVNode, getOwnedChildren(oldVNode));
				if (!e.then) markAsForce(newVNode);
			}
			options._catchError(e, newVNode, oldVNode);
		}
	} else if (
		excessDomChildren == NULL &&
		newVNode._original == oldVNode._original
	) {
		setOwnedChildren(newVNode, getOwnedChildren(oldVNode));
		setOwnedRange(
			newVNode,
			getOwnedFirstDom(oldVNode),
			getLastDom(oldVNode),
			getAnchorDom(oldVNode)
		);
	} else {
		oldDom = diffElementNodes(
			getOwnedFirstDom(oldVNode),
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
			childDiffStats
		);
	}

	if ((tmp = options.diffed)) tmp(newVNode);

	return newVNode._flags & MODE_SUSPENDED ? undefined : oldDom;
}

function markAsForce(vnode) {
	if (vnode) {
		if (vnode._component) vnode._component._force = true;
		let children = getOwnedVChildren(vnode);
		if (children) children.some(markAsForce);
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
	flushUnmounts(unmountQueue, root);
	flushRemoveOps(removeOps);
	flushHostOps(hostOps);

	for (let i = 0; i < refQueue.length; i++) {
		applyRef(refQueue[i], refQueue[++i], refQueue[++i]);
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
			options._catchError(e, c._vnode);
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
function flushUnmounts(unmountQueue, root) {
	for (let i = 0; i < unmountQueue.length; i++) {
		unmount(unmountQueue[i], root, true);
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
	} else {
		if (hostOpCounts != NULL) hostOpCounts.moveRange++;
		hostOps.push(OP_MOVE_RANGE, firstDom, lastDom, parentDom, before || NULL);
	}
}

const OP_SET_TEXT = 1;
const OP_INSERT_NODE = 2;
const OP_MOVE_RANGE = 3;

function cloneNode(node) {
	if (typeof node != 'object' || node == NULL || node._depth > 0) {
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
	isHydrating
) {
	if (
		isHydrating ||
		excessDomChildren != NULL ||
		(newVNode._flags & SINGLE_TEXT_CHILD) == 0 ||
		(newVNode._flags & HAS_KEY) != 0 ||
		(newVNode._flags & ARRAY_CHILDREN) != 0 ||
		(oldVNode._flags & SINGLE_TEXT_CHILD) == 0 ||
		getOwnedVChildren(oldVNode) == NULL ||
		getOwnedVChildren(oldVNode).length !== 1 ||
		getOwnedVChildren(oldVNode)[0] == NULL ||
		getOwnedVChildren(oldVNode)[0].type != NULL
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
	isHydrating
) {
	if (
		isHydrating ||
		excessDomChildren != NULL ||
		getOwnedVChildren(oldVNode) == NULL ||
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
		newVNode._flags,
		newChildren,
		getOwnedVChildren(oldVNode)
	);
}

function areChildrenStructurallyEqual(childFlags, newChildren, oldChildren) {
	if ((childFlags & SINGLE_TEXT_CHILD) != 0) {
		return (
			oldChildren.length === 1 &&
			oldChildren[0] != NULL &&
			oldChildren[0].type == NULL &&
			oldChildren[0].props === newChildren
		);
	}

	if ((childFlags & SINGLE_CHILD) != 0) {
		return (
			oldChildren.length === 1 &&
			isStructurallyEqualChild(newChildren, oldChildren[0])
		);
	}

	if ((childFlags & ARRAY_CHILDREN) != 0) {
		if (!isArray(newChildren) || newChildren.length !== oldChildren.length) {
			return false;
		}

		for (let i = 0; i < newChildren.length; i++) {
			if (!isStructurallyEqualChild(newChildren[i], oldChildren[i])) {
				return false;
			}
		}

		return true;
	}

	return oldChildren.length === 0;
}

function isStructurallyEqualChild(rawChild, oldVNode) {
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
		rawChild.key !== oldVNode.key
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
		getOwnedVChildren(oldVNode) || EMPTY_ARR
	);
}

function createTextVNode(value, parentVNode) {
	let vnode = createVNode(NULL, value, NULL, NULL, NULL);
	vnode._parent = parentVNode;
	vnode._depth = parentVNode._depth + 1;
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
	childDiffStats
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
			setOwnedRange(newVNode, dom, dom, dom);
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
			if (
				allowInlineText ||
				isHydrating ||
				getOwnedFirstDom(oldVNode) == NULL
			) {
				dom.data = newProps;
			} else {
				if (hostOpCounts != NULL) hostOpCounts.setText++;
				hostOps.push(OP_SET_TEXT, dom, newProps);
			}
		}
		setOwnedRange(newVNode, dom, dom, dom);
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

			setOwnedChildren(newVNode, []);
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
					isHydrating
				)
			) {
				let oldTextVNode = getOwnedVChildren(oldVNode)[0];
				let textVNode = createTextVNode(newChildren, newVNode);
				setOwnedChildren(newVNode, [textVNode]);
				diff(
					// @ts-expect-error
					newVNode.type == 'template' ? dom.content : dom,
					textVNode,
					oldTextVNode,
					globalContext,
					nodeType == 'foreignObject' ? XHTML_NAMESPACE : namespace,
					excessDomChildren,
					commitQueue,
					hostOps,
					unmountQueue,
					removeOps,
					getOwnedFirstDom(oldTextVNode),
					isHydrating,
					refQueue,
					true,
					hostOpCounts,
					childDiffStats
				);
			} else if (
				canBailHostSubtree(
					newVNode,
					oldVNode,
					newProps,
					oldProps,
					newChildren,
					excessDomChildren,
					isHydrating
				)
			) {
				setOwnedChildren(newVNode, getOwnedChildren(oldVNode));
				setOwnedRange(
					newVNode,
					dom,
					getLastDom(oldVNode) || dom,
					getAnchorDom(oldVNode) || dom
				);
				let children = getOwnedVChildren(newVNode);
				if (children) {
					children.some(child => {
						if (child) child._parent = newVNode;
					});
				}
			} else {
				diffChildren(
					// @ts-expect-error
					newVNode.type == 'template' ? dom.content : dom,
					isArray(newChildren) ? newChildren : [newChildren],
					newVNode,
					oldVNode,
					globalContext,
					nodeType == 'foreignObject' ? XHTML_NAMESPACE : namespace,
					excessDomChildren,
					commitQueue,
					hostOps,
					unmountQueue,
					removeOps,
					excessDomChildren
						? excessDomChildren[0]
						: getOwnedChildren(oldVNode) && getDomSibling(oldVNode, 0),
					isHydrating,
					refQueue,
					hostOpCounts,
					childDiffStats
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

		setOwnedRange(newVNode, dom, dom, dom);
	}

	return dom;
}

/**
 * Invoke or update a ref, depending on whether it is a function or object ref.
 * @param {Ref<any> & { _unmount?: unknown }} ref
 * @param {any} value
 * @param {VNode} vnode
 */
export function applyRef(ref, value, vnode) {
	try {
		if (typeof ref == 'function') {
			let hasRefUnmount = typeof ref._unmount == 'function';
			if (hasRefUnmount) {
				// @ts-ignore TS doesn't like moving narrowing checks into variables
				ref._unmount();
			}

			if (!hasRefUnmount || value != NULL) {
				// Store the cleanup function on the function
				// instance object itself to avoid shape
				// transitioning vnode
				ref._unmount = ref(value);
			}
		} else ref.current = value;
	} catch (e) {
		options._catchError(e, vnode);
	}
}

/**
 * Unmount a virtual node from the tree and apply DOM changes
 * @param {VNode} vnode The virtual node to unmount
 * @param {VNode} parentVNode The parent of the VNode that initiated the unmount
 * @param {boolean} [skipRemove] Flag that indicates that a parent node of the
 * current element is already detached from the DOM.
 */
export function unmount(vnode, parentVNode, skipRemove) {
	let r;
	if (options.unmount) options.unmount(vnode);

	if ((r = vnode.ref)) {
		if (!r.current || r.current == getOwnedFirstDom(vnode)) {
			applyRef(r, NULL, parentVNode);
		}
	}

	if ((r = vnode._component) != NULL) {
		if (r.componentWillUnmount) {
			try {
				r.componentWillUnmount();
			} catch (e) {
				options._catchError(e, parentVNode);
			}
		}

		r.base = r._parentDom = NULL;
	}

	if ((r = getOwnedChildren(vnode))) {
		for (let i = 0; i < r.length; i++) {
			if (r[i]) {
				unmount(
					r[i],
					parentVNode,
					skipRemove || typeof vnode.type != 'function'
				);
			}
		}
	}

	if (!skipRemove) {
		removeNode(getOwnedFirstDom(vnode));
	}

	vnode._component =
		vnode._parent =
		vnode._dom =
		vnode._lastDom =
		vnode._anchorDom =
			UNDEFINED;
	clearBacking(vnode);
}

/** The `.render()` method for a PFC backing instance. */
function doRender(props, state, context) {
	return this.constructor(props, context);
}
