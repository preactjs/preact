import { Component } from '../component';
import { diffChildren } from './children';
import { Fragment } from '../create-element';
import { assign } from '../util';
import options from '../options';

export function diffComponentNodes(
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

	// Get component and set it to `c`
	if (oldVNode._component) {
		c = newVNode._component = oldVNode._component;
		clearProcessingException = c._processingException = c._pendingError;
	} else {
		isNew = c = newVNode._component = createComponent(
			newType,
			newProps,
			componentContext
		);
		if (provider) provider.sub(c);
		c._globalContext = globalContext;
	}

	if (c._nextState == null) {
		c._nextState = c.state;
	}

	oldProps = c.props;
	oldState = c.state;

	invokeGetDerivedStateFromProps(c, newType, newProps);

	// Invoke pre-render lifecycle methods
	if (isNew) {
		invokeMountLifecycles(c, newType);
	} else {
		if (
			newType.getDerivedStateFromProps == null &&
			newProps !== oldProps &&
			c.componentWillReceiveProps != null
		) {
			c.componentWillReceiveProps(newProps, componentContext);
		}

		if (
			shouldComponentUpdate(c, newProps, componentContext) ||
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

			for (let i = 0; i < newVNode._children.length; i++) {
				if (newVNode._children[i]) {
					newVNode._children[i]._parent = newVNode;
				}
			}

			return true;
		}

		if (c.componentWillUpdate != null) {
			c.componentWillUpdate(newProps, c._nextState, componentContext);
		}
	}

	c._parentDom = parentDom;
	let renderResult = invokeRender(c, newVNode, componentContext);

	if (c.getChildContext != null) {
		globalContext = assign(assign({}, globalContext), c.getChildContext());
	}

	if (!isNew) {
		invokePostRenderLifecycles(c, oldProps, oldState);
	}

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

	if (c._renderCallbacks.length) {
		commitQueue.push(c);
	}

	if (clearProcessingException) {
		c._pendingError = c._processingException = null;
	}

	c._force = false;
}

function createComponent(newType, newProps, componentContext) {
	let c;

	// Instantiate the new component
	if ('prototype' in newType && newType.prototype.render) {
		c = new newType(newProps, componentContext); // eslint-disable-line new-cap
	} else {
		c = new Component(newProps, componentContext);
		c.constructor = newType;
		c.render = doRender;
	}

	c.props = newProps;
	if (!c.state) c.state = {};
	c.context = componentContext;
	c._dirty = true;
	c._renderCallbacks = [];

	return c;
}

function invokeGetDerivedStateFromProps(c, newType, newProps) {
	// Invoke getDerivedStateFromProps
	if (newType.getDerivedStateFromProps != null) {
		if (c._nextState == c.state) {
			c._nextState = assign({}, c._nextState);
		}

		assign(
			c._nextState,
			newType.getDerivedStateFromProps(newProps, c._nextState)
		);
	}
}

function invokeMountLifecycles(c, newType) {
	if (
		newType.getDerivedStateFromProps == null &&
		c.componentWillMount != null
	) {
		c.componentWillMount();
	}

	if (c.componentDidMount != null) {
		c._renderCallbacks.push(c.componentDidMount);
	}
}

function shouldComponentUpdate(c, newProps, componentContext) {
	return (
		!c._force &&
		c.shouldComponentUpdate != null &&
		c.shouldComponentUpdate(newProps, c._nextState, componentContext) === false
	);
}

function invokeRender(c, newVNode, componentContext) {
	c.context = componentContext;
	c.props = newVNode.props;
	c.state = c._nextState;

	if (options._render) options._render(newVNode);

	c._dirty = false;
	c._vnode = newVNode;

	let renderResult = c.render(c.props, c.state, c.context);
	let isTopLevelFragment =
		renderResult != null &&
		renderResult.type == Fragment &&
		renderResult.key == null;

	return isTopLevelFragment ? renderResult.props.children : renderResult;
}

function invokePostRenderLifecycles(c, oldProps, oldState) {
	let snapshot;

	if (c.getSnapshotBeforeUpdate != null) {
		snapshot = c.getSnapshotBeforeUpdate(oldProps, oldState);
	}

	if (c.componentDidUpdate != null) {
		c._renderCallbacks.push(() => {
			c.componentDidUpdate(oldProps, oldState, snapshot);
		});
	}
}

/** The `.render()` method for a PFC backing instance. */
function doRender(props, state, context) {
	return this.constructor(props, context);
}
