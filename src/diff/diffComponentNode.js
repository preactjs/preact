import { diffChildren } from './children';
import { Fragment } from '../create-element';
import { Component } from '../component';

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
 * @param {import('.').DiffData} diffData The current attached DOM
 * element any new dom elements should be placed around. Likely `null` on first
 * render (except when hydrating). Can be a sibling DOM element when diffing
 * Fragments that have siblings. In most cases, it starts out as `oldChildren[0]._dom`.
 * @param {boolean} [isHydrating] Whether or not we are in hydration
 */
export function diffComponentNode(
	parentDom,
	newVNode,
	oldVNode,
	globalContext,
	isSvg,
	excessDomChildren,
	commitQueue,
	diffData,
	isHydrating
) {
	let newType = newVNode.type;
	let tmp, c, isNew, oldProps, oldState, snapshot, clearProcessingException;
	let newProps = newVNode.props;

	// Necessary for createContext api. Setting this property will pass
	// the context value as `this.context` just for this component.
	let componentContext = null;
	// tmp = newType.contextType;
	// let provider = tmp && globalContext[tmp._id];
	// let componentContext = tmp
	// 	? provider
	// 		? provider.props.value
	// 		: tmp._defaultValue
	// 	: globalContext;

	// Get component and set it to `c`
	if (oldVNode._component) {
		c = newVNode._component = oldVNode._component;
		clearProcessingException = c._processingException = c._pendingError;
	} else {
		// Instantiate the new component
		if ('prototype' in newType && newType.prototype.render) {
			newVNode._component = c = new newType(newProps, componentContext); // eslint-disable-line new-cap
		} else {
			newVNode._component = c = new Component(newProps, componentContext);
			c.constructor = newType;
			c.render = doRender;
		}
		// if (provider) provider.sub(c);

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
	// if (newType.getDerivedStateFromProps != null) {
	// 	if (c._nextState == c.state) {
	// 		c._nextState = assign({}, c._nextState);
	// 	}

	// 	assign(
	// 		c._nextState,
	// 		newType.getDerivedStateFromProps(newProps, c._nextState)
	// 	);
	// }

	oldProps = c.props;
	oldState = c.state;

	// Invoke pre-render lifecycle methods
	if (isNew) {
		// if (
		// 	newType.getDerivedStateFromProps == null &&
		// 	c.componentWillMount != null
		// ) {
		// 	c.componentWillMount();
		// }
		// if (c.componentDidMount != null) {
		// 	c._renderCallbacks.push(c.componentDidMount);
		// }
	} else {
		// if (
		// 	newType.getDerivedStateFromProps == null &&
		// 	newProps !== oldProps &&
		// 	c.componentWillReceiveProps != null
		// ) {
		// 	c.componentWillReceiveProps(newProps, componentContext);
		// }

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

			for (tmp = 0; tmp < newVNode._children.length; tmp++) {
				if (newVNode._children[tmp]) {
					newVNode._children[tmp]._parent = newVNode;
				}
			}

			return;
		}

		// if (c.componentWillUpdate != null) {
		// 	c.componentWillUpdate(newProps, c._nextState, componentContext);
		// }

		// if (c.componentDidUpdate != null) {
		// 	c._renderCallbacks.push(() => {
		// 		c.componentDidUpdate(oldProps, oldState, snapshot);
		// 	});
		// }
	}

	// c.context = componentContext;
	c.props = newProps;
	c.state = c._nextState;

	// if ((tmp = options._render)) tmp(newVNode);

	c._dirty = false;
	c._vnode = newVNode;
	c._parentDom = parentDom;

	tmp = c.render(c.props, c.state, c.context);

	// if (c.getChildContext != null) {
	// 	globalContext = assign(assign({}, globalContext), c.getChildContext());
	// }

	// if (!isNew && c.getSnapshotBeforeUpdate != null) {
	// 	snapshot = c.getSnapshotBeforeUpdate(oldProps, oldState);
	// }

	let isTopLevelFragment =
		tmp != null && tmp.type == Fragment && tmp.key == null;
	let renderResult = isTopLevelFragment ? tmp.props.children : tmp;

	diffChildren(
		// ...logArgsShapeChange(
		// 	'diffChildren',
		parentDom,
		Array.isArray(renderResult) ? renderResult : [renderResult],
		newVNode,
		oldVNode,
		globalContext,
		isSvg,
		excessDomChildren,
		commitQueue,
		diffData,
		isHydrating
		// )
	);

	c.base = newVNode._dom;

	if (c._renderCallbacks.length) {
		commitQueue.push(c);
	}

	// if (clearProcessingException) {
	// 	c._pendingError = c._processingException = null;
	// }

	c._force = false;
}

/** The `.render()` method for a PFC backing instance. */
function doRender(props, state, context) {
	return this.constructor(props, context);
}
