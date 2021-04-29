import { Fragment } from '../create-element';
import options from '../options';
import { assign } from '../util';
import { Component } from '../component';
import { mountChildren } from './mount';
import { diffChildren } from './children';
import {
	DIRTY_BIT,
	FORCE_UPDATE,
	MODE_HYDRATE,
	MODE_PENDING_ERROR,
	MODE_RERENDERING_ERROR
} from '../constants';
import { addCommitCallback } from './commit';
import { getDomSibling } from '../tree';

/**
 * Diff two virtual nodes and apply proper changes to the DOM
 * @param {import('../internal').PreactElement} parentDom The parent of the DOM element
 * @param {import('../internal').VNode} newVNode The new virtual node
 * @param {import('../internal').Internal} internal The component's backing Internal node
 * @param {object} globalContext The current context object. Modified by getChildContext
 * @param {import('../internal').CommitQueue} commitQueue List of components
 * which have callbacks to invoke in commitRoot
 * @param {import('../internal').PreactNode} startDom
 * @returns {import('../internal').PreactNode} pointer to the next DOM node (in order) to be rendered (or null)
 */
export function renderComponent(
	parentDom,
	newVNode,
	internal,
	globalContext,
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

	if (internal._flags & MODE_PENDING_ERROR) {
		// Toggle the MODE_PENDING_ERROR and MODE_RERENDERING_ERROR flags. In
		// actuality, this should turn off the MODE_PENDING_ERROR flag and turn on
		// the MODE_RERENDERING_ERROR flag.
		internal._flags ^= MODE_PENDING_ERROR | MODE_RERENDERING_ERROR;
	}

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
		if (!c.state) c.state = {};
		c.context = componentContext;
		c._globalContext = globalContext;
		isNew = true;
		internal._flags |= DIRTY_BIT;
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
			// If the component was constructed, queue up componentDidMount so the
			// first time this internal commits (regardless of suspense or not) it
			// will be called
			addCommitCallback(internal, c.componentDidMount);
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
			(!(internal._flags & FORCE_UPDATE) &&
				c.shouldComponentUpdate != null &&
				c.shouldComponentUpdate(newProps, c._nextState, componentContext) ===
					false) ||
			(newVNode && newVNode._vnodeId === internal._vnodeId)
		) {
			c.props = newProps;
			c.state = c._nextState;
			internal.props = newProps;
			// More info about this here: https://gist.github.com/JoviDeCroock/bec5f2ce93544d2e6070ef8e0036e4e8
			if (newVNode && newVNode._vnodeId !== internal._vnodeId) {
				internal._flags &= ~DIRTY_BIT;
			}

			c._internal = internal;
			if (
				internal._commitCallbacks != null &&
				internal._commitCallbacks.length
			) {
				commitQueue.push(internal);
			}

			// TODO: Returning undefined here (i.e. return;) passes all tests. That seems
			// like a bug. Should validate that we have test coverage for sCU that
			// returns Fragments with multiple DOM children
			return;
		}

		if (c.componentWillUpdate != null) {
			c.componentWillUpdate(newProps, c._nextState, componentContext);
		}
	}

	c.context = componentContext;
	c.props = newProps;
	c.state = c._nextState;

	internal.props = newProps;

	if ((tmp = options._render)) tmp(internal);

	internal._flags &= ~DIRTY_BIT;
	c._internal = internal;

	tmp = c.render(c.props, c.state, c.context);

	// Handle setState called in render, see #2553
	c.state = c._nextState;

	if (c.getChildContext != null) {
		globalContext = assign(assign({}, globalContext), c.getChildContext());
	}

	if (!isNew) {
		if (c.getSnapshotBeforeUpdate != null) {
			snapshot = c.getSnapshotBeforeUpdate(oldProps, oldState);
		}

		// Only schedule componentDidUpdate if the component successfully rendered
		if (c.componentDidUpdate != null) {
			addCommitCallback(internal, () => {
				c.componentDidUpdate(oldProps, oldState, snapshot);
			});
		}
	}

	let isTopLevelFragment =
		tmp != null && tmp.type === Fragment && tmp.key == null;
	let renderResult = isTopLevelFragment ? tmp.props.children : tmp;

	let nextDomSibling;

	if (internal._children == null) {
		nextDomSibling = mountChildren(
			parentDom,
			Array.isArray(renderResult) ? renderResult : [renderResult],
			internal,
			globalContext,
			commitQueue,
			// TODO: Mounting and hydration still use the startDom param
			isNew || internal._flags & MODE_HYDRATE
				? startDom
				: getDomSibling(internal)
		);
	} else {
		nextDomSibling = diffChildren(
			parentDom,
			Array.isArray(renderResult) ? renderResult : [renderResult],
			internal,
			globalContext,
			commitQueue,
			startDom
		);
	}

	if (internal._commitCallbacks != null && internal._commitCallbacks.length) {
		commitQueue.push(internal);
	}

	return nextDomSibling;
}

/** The `.render()` method for a PFC backing instance. */
function doRender(props, state, context) {
	return this.constructor(props, context);
}
