import { Fragment } from '../create-element';
import options from '../options';
import { assign } from '../util';
import { Component } from '../component';
import { mountChildren } from './mount';
import { diffChildren } from './children';

/**
 * Diff two virtual nodes and apply proper changes to the DOM
 * @param {import('../internal').PreactElement} parentDom The parent of the DOM element
 * @param {import('../internal').VNode} newVNode The new virtual node
 * @param {import('../internal').VNode} oldVNode The old virtual node
 * @param {object} globalContext The current context object. Modified by getChildContext
 * @param {boolean} isSvg Whether or not this element is an SVG node
 * @param {Array<import('../internal').Component>} commitQueue List of components
 * which have callbacks to invoke in commitRoot
 * @param {import('../internal').PreactElement} startDom
 * @returns {import('../internal').PreactElement} pointer to the next DOM node (in order) to be rendered (or null)
 */
export function renderComponent(
	parentDom,
	newVNode,
	oldVNode,
	globalContext,
	isSvg,
	commitQueue,
	startDom
) {
	/** @type {import('../internal').Component} */
	let c;
	let isNew, oldProps, oldState, snapshot, clearProcessingException, tmp;

	/** @type {import('../internal').ComponentType} */
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

	if (oldVNode && oldVNode._component) {
		c = newVNode._component = oldVNode._component;
		clearProcessingException = c._processingException = c._pendingError;
	} else {
		// Instantiate the new component
		if ('prototype' in newType && newType.prototype.render) {
			// @ts-ignore The check above verifies that newType is suppose to be constructed
			newVNode._component = c = new newType(newProps, componentContext); // eslint-disable-line new-cap
		} else {
			// @ts-ignore Trust me, Component implements the interface we want
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
	}

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
	if (isNew) {
		if (
			newType.getDerivedStateFromProps == null &&
			c.componentWillMount != null
		) {
			c.componentWillMount();
		}

		if (c.componentDidMount != null) {
			c._renderCallbacks.push(c.componentDidMount);
		}
	} else {
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

	let nextDomSibling;

	if (isNew) {
		nextDomSibling = mountChildren(
			parentDom,
			Array.isArray(renderResult) ? renderResult : [renderResult],
			newVNode,
			globalContext,
			isSvg,
			commitQueue,
			startDom
		);
	} else {
		nextDomSibling = diffChildren(
			parentDom,
			Array.isArray(renderResult) ? renderResult : [renderResult],
			newVNode,
			oldVNode,
			globalContext,
			isSvg,
			commitQueue,
			startDom
		);
	}

	c.base = newVNode._dom;

	if (c._renderCallbacks.length) {
		commitQueue.push(c);
	}

	if (clearProcessingException) {
		c._pendingError = c._processingException = null;
	}

	c._force = false;

	return nextDomSibling;
}

/** The `.render()` method for a PFC backing instance. */
function doRender(props, state, context) {
	return this.constructor(props, context);
}
