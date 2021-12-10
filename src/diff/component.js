import options from '../options';
import { DIRTY_BIT, FORCE_UPDATE, SKIP_CHILDREN } from '../constants';
import { addCommitCallback } from './commit';

export function renderFunctionComponent(
	newVNode,
	internal,
	context,
	componentContext
) {
	/** @type {import('../internal').Component} */
	let c;
	let tmp;

	/** @type {import('../internal').ComponentType} */
	let type = (internal.type);

	// @TODO split update + mount?
	let newProps = newVNode ? newVNode.props : internal.props;

	if (internal && internal._component) {
		c = internal._component;
	} else {
		internal._component = c = {
			props: newProps,
			context: componentContext,
			forceUpdate: internal.rerender.bind(null, internal)
		};

		internal.flags |= DIRTY_BIT;
	}

	if (newVNode && newVNode._vnodeId === internal._vnodeId) {
		c.props = newProps;
		internal.flags |= SKIP_CHILDREN;
		return;
	}

	c.context = componentContext;
	internal.props = c.props = newProps;

	if ((tmp = options._render)) tmp(internal);

	internal.flags &= ~DIRTY_BIT;
	c._internal = internal;

	tmp = type.call(c, c.props, c.context);

	if (c.getChildContext != null) {
		internal._context = Object.assign({}, context, c.getChildContext());
	}

	return tmp;
}

/**
 * Diff two virtual nodes and apply proper changes to the DOM
 * @param {import('../internal').VNode} newVNode The new virtual node
 * @param {import('../internal').Internal} internal The component's backing Internal node
 * @returns {import('../internal').PreactNode} pointer to the next DOM node (in order) to be rendered (or null)
 */
export function renderClassComponent(
	newVNode,
	internal,
	context,
	componentContext
) {
	/** @type {import('../internal').Component} */
	let c;
	let isNew, oldProps, oldState, snapshot, tmp;

	/** @type {import('../internal').ComponentType} */
	let type = (internal.type);

	// @TODO split update + mount?
	let newProps = newVNode ? newVNode.props : internal.props;

	if (internal && internal._component) {
		c = internal._component;
	} else {
		// @ts-ignore The check above verifies that newType is suppose to be constructed
		internal._component = c = new type(newProps, componentContext); // eslint-disable-line new-cap

		if (!c.state) c.state = {};
		isNew = true;
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
			addCommitCallback(internal, c.componentDidMount.bind(c));
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
			(!(internal.flags & FORCE_UPDATE) &&
				c.shouldComponentUpdate != null &&
				c.shouldComponentUpdate(newProps, c._nextState, componentContext) ===
					false) ||
			(newVNode && newVNode._vnodeId === internal._vnodeId)
		) {
			c.props = newProps;
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

	if ((tmp = options._render)) tmp(internal);

	internal.flags &= ~DIRTY_BIT;
	c._internal = internal;

	tmp = c.render(c.props, c.state, c.context);

	// Handle setState called in render, see #2553
	c.state = c._nextState;

	if (c.getChildContext != null) {
		internal._context = Object.assign({}, context, c.getChildContext());
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

	return tmp;
}
