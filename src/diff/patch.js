import { Fragment } from '../create-element';
import { diffChildren } from './children';
import { assign } from '../util';
import options from '../options';
import { diffElementNodes } from '.';

/**
 * Diff two virtual nodes and apply proper changes to the DOM
 * @param {import('../internal').PreactElement} parentDom The parent of the DOM element
 * @param {import('../internal').VNode} newVNode The new virtual node
 * @param {import('../internal').VNode} oldVNode The old virtual node
 * @param {object} globalContext The current context object. Modified by getChildContext
 * @param {boolean} isSvg Whether or not this element is an SVG node
 * @param {Array<import('../internal').PreactElement>} excessDomChildren
 * @param {Array<import('../internal').Component>} commitQueue List of components
 * which have callbacks to invoke in commitRoot
 * @param {import('../internal').PreactElement} oldDom The current attached DOM
 * element any new dom elements should be placed around. Likely `null` on first
 * render (except when hydrating). Can be a sibling DOM element when diffing
 * Fragments that have siblings. In most cases, it starts out as `oldChildren[0]._dom`.
 * @param {boolean} [isHydrating] Whether or not we are in hydration
 */
export function patch(
	parentDom,
	newVNode,
	oldVNode,
	globalContext,
	isSvg,
	excessDomChildren,
	commitQueue,
	oldDom,
	isHydrating
) {
	let tmp,
		newType = newVNode.type;

	// When passing through createElement it assigns the object
	// constructor as undefined. This to prevent JSON-injection.
	if (newVNode.constructor !== undefined) return null;

	// If the previous diff bailed out, resume creating/hydrating.
	if (oldVNode._hydrating != null) {
		isHydrating = oldVNode._hydrating;
		oldDom = newVNode._dom = oldVNode._dom;
		// if we resume, we want the tree to be "unlocked"
		newVNode._hydrating = null;
		excessDomChildren = [oldDom];
	}

	if ((tmp = options._diff)) tmp(newVNode);

	try {
		if (typeof newType == 'function') {
			patchComponent(
				parentDom,
				newVNode,
				oldVNode,
				globalContext,
				isSvg,
				excessDomChildren,
				commitQueue,
				oldDom,
				isHydrating
			);
		} else if (
			excessDomChildren == null &&
			newVNode._original === oldVNode._original
		) {
			newVNode._children = oldVNode._children;
			newVNode._dom = oldVNode._dom;
		} else {
			newVNode._dom = diffElementNodes(
				oldVNode._dom,
				newVNode,
				oldVNode,
				globalContext,
				isSvg,
				excessDomChildren,
				commitQueue,
				isHydrating
			);
		}

		if ((tmp = options.diffed)) tmp(newVNode);
	} catch (e) {
		newVNode._original = null;
		// if hydrating or creating initial tree, bailout preserves DOM:
		if (isHydrating || excessDomChildren != null) {
			newVNode._dom = oldDom;
			newVNode._hydrating = !!isHydrating;
			excessDomChildren[excessDomChildren.indexOf(oldDom)] = null;
			// ^ could possibly be simplified to:
			// excessDomChildren.length = 0;
		}
		options._catchError(e, newVNode, oldVNode);
	}
}

/**
 * Diff two virtual nodes and apply proper changes to the DOM
 * @param {import('../internal').PreactElement} parentDom The parent of the DOM element
 * @param {import('../internal').VNode} newVNode The new virtual node
 * @param {import('../internal').VNode} oldVNode The old virtual node
 * @param {object} globalContext The current context object. Modified by getChildContext
 * @param {boolean} isSvg Whether or not this element is an SVG node
 * @param {Array<import('../internal').PreactElement>} excessDomChildren
 * @param {Array<import('../internal').Component>} commitQueue List of components
 * which have callbacks to invoke in commitRoot
 * @param {import('../internal').PreactElement} oldDom The current attached DOM
 * element any new dom elements should be placed around. Likely `null` on first
 * render (except when hydrating). Can be a sibling DOM element when diffing
 * Fragments that have siblings. In most cases, it starts out as `oldChildren[0]._dom`.
 * @param {boolean} [isHydrating] Whether or not we are in hydration
 */
function patchComponent(
	parentDom,
	newVNode,
	oldVNode,
	globalContext,
	isSvg,
	excessDomChildren,
	commitQueue,
	oldDom,
	isHydrating
) {
	let c, isNew, oldProps, oldState, snapshot, clearProcessingException, tmp;
	let newType = newVNode.type;
	let newProps = newVNode.props;

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
	c = newVNode._component = oldVNode._component;
	clearProcessingException = c._processingException = c._pendingError;

	// Invoke getDerivedStateFromProps
	if (c._nextState == null) {
		c._nextState = c.state;
	}
	if (newType.getDerivedStateFromProps != null) {
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

	// Invoke pre-render lifecycle methods
	if (
		newType.getDerivedStateFromProps == null &&
		newProps !== oldProps &&
		c.componentWillReceiveProps != null
	) {
		c.componentWillReceiveProps(newProps, componentContext);
	}

	if (
		(!c._force &&
			c.shouldComponentUpdate != null &&
			c.shouldComponentUpdate(newProps, c._nextState, componentContext) ===
				false) ||
		newVNode._original === oldVNode._original
	) {
		c.props = newProps;
		c.state = c._nextState;
		// More info about this here: https://gist.github.com/JoviDeCroock/bec5f2ce93544d2e6070ef8e0036e4e8
		if (newVNode._original !== oldVNode._original) c._dirty = false;
		c._vnode = newVNode;
		newVNode._dom = oldVNode._dom;
		newVNode._children = oldVNode._children;
		if (c._renderCallbacks.length) {
			commitQueue.push(c);
		}

		return;
	}

	if (c.componentWillUpdate != null) {
		c.componentWillUpdate(newProps, c._nextState, componentContext);
	}

	if (c.componentDidUpdate != null) {
		c._renderCallbacks.push(() => {
			c.componentDidUpdate(oldProps, oldState, snapshot);
		});
	}

	c.context = componentContext;
	c.props = newProps;
	c.state = c._nextState;

	if ((tmp = options._render)) tmp(newVNode);

	c._dirty = false;
	c._vnode = newVNode;
	c._parentDom = parentDom;

	tmp = c.render(c.props, c.state, c.context);

	// Handle setState called in render, see #2553
	c.state = c._nextState;

	if (c.getChildContext != null) {
		globalContext = assign(assign({}, globalContext), c.getChildContext());
	}

	if (!isNew && c.getSnapshotBeforeUpdate != null) {
		snapshot = c.getSnapshotBeforeUpdate(oldProps, oldState);
	}

	let isTopLevelFragment =
		tmp != null && tmp.type === Fragment && tmp.key == null;
	let renderResult = isTopLevelFragment ? tmp.props.children : tmp;

	diffChildren(
		parentDom,
		Array.isArray(renderResult) ? renderResult : [renderResult],
		newVNode,
		oldVNode,
		globalContext,
		isSvg,
		excessDomChildren,
		commitQueue,
		oldDom,
		isHydrating
	);

	c.base = newVNode._dom;

	// We successfully rendered this VNode, unset any stored hydration/bailout state:
	newVNode._hydrating = null;

	if (c._renderCallbacks.length) {
		commitQueue.push(c);
	}

	if (clearProcessingException) {
		c._pendingError = c._processingException = null;
	}

	c._force = false;
}
