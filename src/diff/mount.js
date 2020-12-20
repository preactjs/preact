import { EMPTY_OBJ, EMPTY_ARR } from '../constants';
import { Component } from '../component';
import { Fragment } from '../create-element';
import { diffChildren } from './children';
import { diffProps, setProperty } from './props';
import { assign, removeNode } from '../util';
import options from '../options';

/**
 * Diff two virtual nodes and apply proper changes to the DOM
 * @param {import('../internal').PreactElement} parentDom The parent of the DOM element
 * @param {import('../internal').VNode} newVNode The new virtual node
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
export function mount(
	parentDom,
	newVNode,
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

	// // If the previous diff bailed out, resume creating/hydrating.
	// if (oldVNode._hydrating != null) {
	// 	isHydrating = oldVNode._hydrating;
	// 	oldDom = newVNode._dom = oldVNode._dom;
	// 	// if we resume, we want the tree to be "unlocked"
	// 	newVNode._hydrating = null;
	// 	excessDomChildren = [oldDom];
	// }

	if ((tmp = options._diff)) tmp(newVNode);

	try {
		if (typeof newType == 'function') {
			mountComponent(
				parentDom,
				newVNode,
				globalContext,
				isSvg,
				excessDomChildren,
				commitQueue,
				oldDom,
				isHydrating
			);
			// } else if (
			// 	excessDomChildren == null &&
			// 	newVNode._original === oldVNode._original
			// ) {
			// 	newVNode._children = oldVNode._children;
			// 	newVNode._dom = oldVNode._dom;
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
		options._catchError(e, newVNode, null);
	}
}

export function mountComponent(
	parentDom,
	newVNode,
	globalContext,
	isSvg,
	excessDomChildren,
	commitQueue,
	oldDom,
	isHydrating
) {
	let tmp, c, isNew, oldProps, oldState, clearProcessingException;
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

	// Instantiate the new component
	if ('prototype' in newType && newType.prototype.render) {
		newVNode._component = c = new newType(newProps, componentContext); // eslint-disable-line new-cap
	} else {
		newVNode._component = c = new Component(newProps, componentContext);
		c.constructor = newType;
		c.render = doRender;
	}
	if (provider) provider.sub(c);

	c.props = newProps;
	if (!c.state) c.state = {};
	c.context = componentContext;
	c._globalContext = globalContext;
	isNew = c._dirty = true;
	c._renderCallbacks = [];

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

	if (
		newType.getDerivedStateFromProps == null &&
		c.componentWillMount != null
	) {
		c.componentWillMount();
	}

	if (c.componentDidMount != null) {
		c._renderCallbacks.push(c.componentDidMount);
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

	let isTopLevelFragment =
		tmp != null && tmp.type === Fragment && tmp.key == null;
	let renderResult = isTopLevelFragment ? tmp.props.children : tmp;

	diffChildren(
		parentDom,
		Array.isArray(renderResult) ? renderResult : [renderResult],
		newVNode,
		null,
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

/** The `.render()` method for a PFC backing instance. */
function doRender(props, state, context) {
	return this.constructor(props, context);
}

// export function mountChildren() {}
