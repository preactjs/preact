import { Fragment } from '../create-element';
import options from '../options';
import { assign } from '../util';
import { Component } from '../component';
import { mountChildren } from './mount';
import { diffChildren, reorderChildren } from './children';
import {
	DIRTY_BIT,
	FORCE_UPDATE,
	MODE_PENDING_ERROR,
	MODE_RERENDERING_ERROR,
	TYPE_ROOT
} from '../constants';
import { getDomSibling } from '../tree';

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
		c._renderCallbacks = [];
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
			c._renderCallbacks.push(c.componentDidMount);
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
			if (c._renderCallbacks.length) {
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
	}

	c.context = componentContext;
	c.props = newProps;
	c.state = c._nextState;

	internal.props = newProps;

	if ((tmp = options._render)) tmp(internal);

	// Root nodes signal that we attempt to render into a specific DOM node
	// on the page. Root nodes can occur anywhere in the tree and not just
	// at the top.
	let oldStartDom = startDom;
	let oldParentDom = parentDom;
	if (internal._flags & TYPE_ROOT) {
		parentDom = newProps._parentDom || parentDom;

		if (internal && internal._dom) {
			startDom = internal._dom;
		}

		// The `startDom` variable might point to a node from another
		// tree from a previous render
		if (startDom != null && startDom.parentNode !== parentDom) {
			startDom = null;
		}
	}

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
			c._renderCallbacks.push(() => {
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
			isSvg,
			commitQueue,
			startDom
		);
	} else {
		nextDomSibling = diffChildren(
			parentDom,
			Array.isArray(renderResult) ? renderResult : [renderResult],
			internal,
			globalContext,
			isSvg,
			commitQueue,
			startDom
		);
	}

	if (c._renderCallbacks.length) {
		commitQueue.push(c);
	}

	// Resume where we left of before the Portal
	if (internal._flags & TYPE_ROOT) {
		if (oldStartDom) {
			// We just finished diffing a root node and have a startDom from the tree
			// above/around the root node. Let's figure out where the diff should
			// resume...
			if (oldParentDom == parentDom) {
				// If the root node rendered into the same parent DOM as its parent
				// tree, we'll just resume from the end of the root node as if nothing
				// happened.
				return nextDomSibling;
			} else if (oldStartDom.parentNode == oldParentDom) {
				// If the previous value for start dom still has the same parent DOM has
				// the root node's parent tree, then we can use it. This case assumes
				// the root node rendered its children into a new parent.
				return oldStartDom;
			} else {
				// Here, if the parentDoms are different and oldStartDom has moved into
				// a new parentDom, we'll assume the root node moved oldStartDom under
				// the new parentDom. Because of this change, we need to search the
				// internal tree for the next DOM sibling the tree should begin with

				// @TODO Ensure there is suspense test with <Fragment><div><//> siblings
				// around Suspense and suspender
				//
				// @TODO Hmmm here we are searching the internal before the newChildren
				// are set on the internal, meaning if this root node is being mounted it
				// won't find itself in the parent's array to begin searching siblings
				// after itself... Think about if this could lead to bugs...
				return getDomSibling(internal);
			}
		}

		return oldStartDom;
	}

	return nextDomSibling;
}

/** The `.render()` method for a PFC backing instance. */
function doRender(props, state, context) {
	return this.constructor(props, context);
}
