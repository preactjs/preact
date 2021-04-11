import { Fragment, Component, options } from '../index';
import { assign } from '../util';
import { COMMIT_COMPONENT, FORCE_UPDATE } from '../constants';

/**
 * Diff two virtual nodes and apply proper changes to the DOM
 * @param {import('../internal').VNode} newVNode The new virtual node
 * @param {import('../internal').Internal} internal The component's backing Internal node
 * @param {import('../internal').RendererState} rendererState An object
 * containing the current state of the renderer. See comments in the
 * RendererState interface.
 * @returns {import('../internal').PreactNode} pointer to the next DOM node (in order) to be rendered (or null)
 */
export function renderReactComponent(newVNode, internal, rendererState) {
	/** @type {import('../internal').Component} */
	let c;
	let isNew, oldProps, oldState, snapshot, tmp;

	/** @type {import('../internal').ComponentType} */
	let type = (internal.type);

	// @TODO split update + mount?
	let newProps = newVNode.props;

	// Necessary for createContext api. Setting this property will pass
	// the context value as `this.context` just for this component.
	tmp = type.contextType;
	let provider = tmp && rendererState.context[tmp._id];
	let componentContext = tmp
		? provider
			? provider.props.value
			: tmp._defaultValue
		: rendererState.context;

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
		isNew = true;
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
			addCommitCallback(c, c.componentDidMount);
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
			~internal.flags & FORCE_UPDATE &&
			c.shouldComponentUpdate != null &&
			c.shouldComponentUpdate(newProps, c._nextState, componentContext) ===
				false
		) {
			c.props = newProps;
			c.state = c._nextState;
			rendererState.skip = true;
			return;
		}

		if (c.componentWillUpdate != null) {
			c.componentWillUpdate(newProps, c._nextState, componentContext);
		}
	}

	c.context = componentContext;
	c.props = newProps;
	c.state = c._nextState;

	if ((tmp = options._render)) tmp(internal);

	c._internal = internal;

	tmp = c.render(c.props, c.state, c.context);

	// Handle setState called in render, see #2553
	c.state = c._nextState;

	if (c.getChildContext != null) {
		// TODO: is this right?? Or should this component have its own property off
		// of rendererState.context?

		// The code below is a condensed form of:
		// rendererState.context = { ...rendererState.context, ...c.getChildContext() };
		rendererState.context = assign(
			assign({}, rendererState.context),
			c.getChildContext()
		);
	}

	if (!isNew) {
		if (c.getSnapshotBeforeUpdate != null) {
			snapshot = c.getSnapshotBeforeUpdate(oldProps, oldState);
		}

		// Only schedule componentDidUpdate if the component successfully rendered
		if (c.componentDidUpdate != null) {
			addCommitCallback(c, () => {
				c.componentDidUpdate(oldProps, oldState, snapshot);
			});
		}
	}

	if (c._commitCallbacks != null && c._commitCallbacks.length) {
		internal.flags |= COMMIT_COMPONENT;
	}

	let isTopLevelFragment =
		tmp != null && tmp.type === Fragment && tmp.key == null;
	return isTopLevelFragment ? tmp.props.children : tmp;
}

/**
 * @param {import('../internal').Component} component
 * @param {() => void} callback
 */
export function addCommitCallback(component, callback) {
	if (component._commitCallbacks == null) {
		component._commitCallbacks = [];
	}

	component._commitCallbacks.push(callback);
}

/** @param {import('../internal').Internal} internal */
export function commitReactComponent(internal) {
	// @ts-ignore Reuse the commitQueue variable here so the type changes
	let callbacks = internal._component._commitCallbacks;
	internal._component._commitCallbacks = [];
	callbacks.some(cb => {
		cb.call(internal._component);
	});
}

/** @param {import('../internal').Internal} internal */
export function unmountReactComponent(internal) {
	// This _component existence check may seem weird but it is necessary because
	// if a component throws in its constructor, then the component never mounted
	// and so doesn't have an instance.
	if (internal._component && internal._component.componentWillUnmount) {
		internal._component.componentWillUnmount();
	}
}

/** The `.render()` method for a PFC backing instance. */
function doRender(props, state, context) {
	return this.constructor(props, context);
}
