import { Fragment } from '../create-element';
import options from '../options';
import { assign } from '../util';
import { Component } from '../component';
import { mountChildren } from './mount';
import { diffChildren, reorderChildren } from './children';
import { DIRTY } from '../constants';

/**
 * Diff two virtual nodes and apply proper changes to the DOM
 * @param {import('../internal').PreactElement} parentDom The parent of the DOM element
 * @param {import('../internal').VNode} newVNode The new virtual node
 * @param {import('../internal').Internal} internal The component's backing Internal node
 * @param {object} globalContext The current context object. Modified by getChildContext
 * @param {boolean} isSvg Whether or not this element is an SVG node
 * @param {Array<import('../internal').Component>} commitQueue List of components
 * which have callbacks to invoke in commitRoot
 * @param {import('../internal').PreactNode} startDom
 * @returns {import('../internal').PreactNode} pointer to the next DOM node (in order) to be rendered (or null)
 */
export function renderComponent(
	parentDom,
	newVNode,
	internal,
	globalContext,
	isSvg,
	commitQueue,
	startDom
) {
	/** @type {import('../internal').Component} */
	let c;
	let isNew, oldProps, oldState, snapshot, tmp;

	/** @type {import('../internal').ComponentType} */
	let type = (internal.type);

	// @TODO split update + mount?
	let newProps = newVNode ? newVNode.props : internal.props;

	// Necessary for createContext api. Setting this property will pass
	// the context value as `this.context` just for this component.
	tmp = type.contextType;
	let provider = tmp && globalContext[tmp._id];
	let componentContext = tmp
		? provider
			? provider.props.value
			: tmp._defaultValue
		: globalContext;

	if (internal && internal._component) {
		c = internal._component;
	} else {
		// Instantiate the new component
		if ('prototype' in type && type.prototype.render) {
			// @ts-ignore The check above verifies that newType is suppose to be constructed
			internal._component = c = new type(newProps, componentContext); // eslint-disable-line new-cap
		} else {
			// @ts-ignore Trust me, Component implements the interface we want
			internal._component = c = new Component(newProps, componentContext);
			c.constructor = type;
			c.render = doRender;
		}
		if (provider) provider.sub(c);

		c.props = newProps;
		// if (!c.state) c.state = {};
		c.context = componentContext;
		// c._globalContext = globalContext;
		// isNew = c._dirty = true;
		// c._renderCallbacks = [];
		isNew = true;
		internal._mode |= DIRTY;
	}

	// Invoke getDerivedStateFromProps
	if (c._nextState == null) {
		c._nextState = c.state;
	}
	if (type.getDerivedStateFromProps != null) {
		if (c._nextState == c.state) {
			c._nextState = assign({}, c._nextState);
		}

		assign(c._nextState, type.getDerivedStateFromProps(newProps, c._nextState));
	}

	oldProps = c.props;
	oldState = c.state;
	if (isNew) {
		if (type.getDerivedStateFromProps == null && c.componentWillMount != null) {
			c.componentWillMount();
		}

		if (c.componentDidMount != null) {
			addRenderCallback(c, c.componentDidMount);
		}
	} else {
		if (
			type.getDerivedStateFromProps == null &&
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
			(newVNode && newVNode._original === internal._original)
		) {
			c.props = newProps;
			c.state = c._nextState;
			internal.props = newProps;
			// More info about this here: https://gist.github.com/JoviDeCroock/bec5f2ce93544d2e6070ef8e0036e4e8
			if (newVNode && newVNode._original !== internal._original) {
				internal._mode &= ~DIRTY;
			}
			// @TODO: rename to c._internal
			c._vnode = internal;
			if (c._renderCallbacks && c._renderCallbacks.length) {
				commitQueue.push(c);
			}

			// TODO: Returning undefined here (i.e. return;) passes all tests. That seems
			// like a bug. Should validate that we have test coverage for sCU that
			// returns Fragments with multiple DOM children
			return reorderChildren(internal, startDom, parentDom);
		}

		if (c.componentWillUpdate != null) {
			c.componentWillUpdate(newProps, c._nextState, componentContext);
		}

		if (c.componentDidUpdate != null) {
			addRenderCallback(c, () => {
				c.componentDidUpdate(oldProps, oldState, snapshot);
			});
		}
	}

	c.context = componentContext;
	c.props = newProps;
	c.state = c._nextState;

	internal.props = newProps;

	if ((tmp = options._render)) tmp(internal);

	internal._mode &= ~DIRTY;
	// @TODO: rename to c._internal
	c._vnode = internal;
	// c._parentDom = parentDom;

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

	if (internal._children == null) {
		nextDomSibling = mountChildren(
			parentDom,
			// Array.isArray(renderResult) ? renderResult : [renderResult],
			renderResult,
			internal,
			globalContext,
			isSvg,
			commitQueue,
			startDom
		);
	} else {
		nextDomSibling = diffChildren(
			parentDom,
			// Array.isArray(renderResult) ? renderResult : [renderResult],
			renderResult,
			internal,
			globalContext,
			isSvg,
			commitQueue,
			startDom
		);
	}

	if (c._renderCallbacks && c._renderCallbacks.length) {
		commitQueue.push(c);
	}

	// c._force = false;

	return nextDomSibling;
}

/** The `.render()` method for a PFC backing instance. */
function doRender(props, state, context) {
	return this.constructor(props, context);
}

/**
 * @param {import('../internal').Component} c
 * @param {() => any} callback
 */
export function addRenderCallback(c, callback) {
	if (c._renderCallbacks) {
		c._renderCallbacks.push(callback);
	} else {
		c._renderCallbacks = [callback];
	}
}
