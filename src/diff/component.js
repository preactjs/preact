import options from '../options';
import { DIRTY_BIT, FORCE_UPDATE, SKIP_CHILDREN } from '../constants';
import { rendererState } from '../component';

/**
 * Render a function component
 * @param {import('../internal').Internal} internal The component's backing Internal node
 * @param {import('../internal').VNode} newVNode The new virtual node
 * @returns {import('../internal').ComponentChildren} the component's children
 */
export function renderFunctionComponent(internal, newVNode, componentContext) {
	/** @type {import('../internal').Component} */
	let c;

	let type = /** @type {import('../internal').ComponentType} */ (internal.type);

	// @TODO split update + mount?
	let newProps = newVNode ? newVNode.props : internal.props;

	if (!(c = internal._component)) {
		internal._component = c = {
			props: newProps,
			context: componentContext,
			forceUpdate: internal.rerender.bind(null, internal)
		};
		c._internal = internal;
		internal.flags |= DIRTY_BIT;
	}

	c.context = componentContext;
	internal.props = c.props = newProps;

	let renderResult;
	let renderHook = options._render;
	let counter = 0;
	while (counter++ < 25) {
		internal.flags &= ~DIRTY_BIT;
		if (renderHook) renderHook(internal);
		renderResult = type.call(c, c.props, componentContext);
		if (!(internal.flags & DIRTY_BIT)) {
			break;
		}
	}
	internal.flags &= ~DIRTY_BIT;
	if (c.getChildContext != null) {
		rendererState._context = internal._context = Object.assign(
			{},
			rendererState._context,
			c.getChildContext()
		);
	}

	return renderResult;
}

/**
 * Render a class component
 * @param {import('../internal').Internal} internal The component's backing Internal node
 * @param {import('../internal').VNode} newVNode The new virtual node
 * @returns {import('../internal').ComponentChildren} the component's children
 */
export function renderClassComponent(internal, newVNode, componentContext) {
	/** @type {import('../internal').Component} */
	let c;
	let isNew, oldProps, oldState, snapshot;

	let type = /** @type {import('../internal').ComponentType} */ (internal.type);

	// @TODO split update + mount?
	let newProps = newVNode ? newVNode.props : internal.props;

	if (!(c = internal._component)) {
		// @ts-ignore The check above verifies that newType is suppose to be constructed
		internal._component = c = new type(newProps, componentContext); // eslint-disable-line new-cap

		if (!c.state) c.state = {};
		isNew = true;
		c._internal = internal;
		internal.flags |= DIRTY_BIT;
	}

	// Invoke getDerivedStateFromProps
	if (c._nextState == null) {
		c._nextState = c.state;
	}
	if (type.getDerivedStateFromProps != null) {
		if (c._nextState == c.state) {
			c._nextState = Object.assign({}, c._nextState);
		}

		Object.assign(
			c._nextState,
			type.getDerivedStateFromProps(newProps, c._nextState)
		);
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
			internal._commitCallbacks.push(c.componentDidMount.bind(c));
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
			!(internal.flags & FORCE_UPDATE) &&
			c.shouldComponentUpdate != null &&
			c.shouldComponentUpdate(newProps, c._nextState, componentContext) ===
				false
		) {
			c.state = c._nextState;
			internal.flags |= SKIP_CHILDREN;
			return;
		}

		if (c.componentWillUpdate != null) {
			c.componentWillUpdate(newProps, c._nextState, componentContext);
		}
	}

	c.context = componentContext;
	internal.props = c.props = newProps;
	c.state = c._nextState;

	let renderHook = options._render;
	if (renderHook) renderHook(internal);

	internal.flags &= ~DIRTY_BIT;

	let renderResult = c.render(c.props, c.state, c.context);

	// Handle setState called in render, see #2553
	c.state = c._nextState;

	if (c.getChildContext != null) {
		rendererState._context = internal._context = Object.assign(
			{},
			rendererState._context,
			c.getChildContext()
		);
	}

	if (!isNew) {
		if (c.getSnapshotBeforeUpdate != null) {
			snapshot = c.getSnapshotBeforeUpdate(oldProps, oldState);
		}

		// Only schedule componentDidUpdate if the component successfully rendered
		if (c.componentDidUpdate != null) {
			internal._commitCallbacks.push(() => {
				c.componentDidUpdate(oldProps, oldState, snapshot);
			});
		}
	}

	return renderResult;
}
