import { EMPTY_OBJ, EMPTY_ARR } from '../constants';
import { Component } from '../component';
import { Fragment } from '../create-element';
import { diffChildren, toChildArray } from './children';
import { diffProps } from './props';
import { assign, removeNode } from '../util';
import options from '../options';

export function diff(
	parentDom,
	newVNode,
	oldVNode,
	context,
	isSvg,
	excessDomChildren,
	oldDom,
	isHydrating
) {
	let tmp,
		newType = newVNode.type,
		old = assign({}, oldVNode);

	// JSON-injection assertion (this invalidates) a subtree when
	// an XSS-attack is potentially happening this because
	// the constructor property can't be set to undefined through JSON.
	if (newVNode.constructor !== undefined) return undefined;

	// Before diff
	if ((tmp = options._diff)) tmp(newVNode);

	try {
		outer: if (typeof newType === 'function') {
			let c, isNew, oldProps, oldState, clearProcessingException;
			let newProps = newVNode.props;
			let provider = tmp && context[tmp._id];
			let cctx = tmp
				? provider
					? provider.props.value
					: tmp._defaultValue
				: context;

			// Necessary for createContext api. Setting this property will pass
			// the context value as `this.context` just for this component.
			tmp = newType.contextType;

			if (oldVNode._component) {
				// We already had a component
				c = newVNode._component = oldVNode._component;
				clearProcessingException = c._processingException = c._pendingError;
				c.isNew = false;
			} else {
				// First time render
				if ('prototype' in newType && newType.prototype.render) {
					// If we have a prototype we are dealing with a class component
					newVNode._component = c = new newType(newProps, cctx); // eslint-disable-line new-cap
				} else {
					// Fucntional component path
					newVNode._component = c = new Component(newProps, cctx);
					c.constructor = newType;
					c.render = doRender;
				}
				if (provider) provider.sub(c);

				c.props = newProps;
				if (!c.state) c.state = {};
				c.context = cctx;
				c._context = context;
				c.isNew = isNew = c._dirty = true;
				c._renderCallbacks = [];
			}

			// If we have no _nextState just set it to our current state
			if (c._nextState == null) {
				c._nextState = c.state;
			}

			// Invoke getDerivedStateFromProps
			if (newType.getDerivedStateFromProps != null) {
				if (c._nextState == c.state) {
					c._nextState = assign({}, c._nextState);
				}

				// Merge our current next-state with the one received from getDerived
				assign(
					c._nextState,
					newType.getDerivedStateFromProps(newProps, c._nextState)
				);
			}

			oldProps = c.props;
			oldState = c.state;

			// New components will be notified that they will mount
			if (isNew) {
				if (
					newType.getDerivedStateFromProps == null &&
					c.componentWillMount != null
				) {
					c.componentWillMount();
				}
			} else {
				if (
					newType.getDerivedStateFromProps == null &&
					c._force == null &&
					c.componentWillReceiveProps != null
				) {
					c.componentWillReceiveProps(newProps, cctx);
				}

				if (
					!c._force &&
					c.shouldComponentUpdate != null &&
					c.shouldComponentUpdate(newProps, c._nextState, cctx) === false
				) {
					c.props = newProps;
					c.state = c._nextState;
					c._dirty = false;
					c._vnode = newVNode;
					newVNode._dom = oldVNode._dom;
					newVNode._children = oldVNode._children;

					for (tmp = 0; tmp < newVNode._children.length; tmp++) {
						if (newVNode._children[tmp]) {
							newVNode._children[tmp]._parent = newVNode;
						}
					}
					break outer;
				}

				if (c.componentWillUpdate != null) {
					c.componentWillUpdate(newProps, c._nextState, cctx);
				}
			}

			c.context = cctx;
			c.props = newProps;
			c.state = c._nextState;

			if ((tmp = options._render)) tmp(newVNode);

			c._dirty = false;
			c._vnode = newVNode;
			c._parentDom = parentDom;

			tmp = c.render(c.props, c.state, c.context);
			let isTopLevelFragment =
				tmp != null && tmp.type == Fragment && tmp.key == null;
			newVNode._children = toChildArray(
				isTopLevelFragment ? tmp.props.children : tmp
			);

			if (c.getChildContext != null) {
				context = assign(assign({}, context), c.getChildContext());
			}

			if (!isNew && c.getSnapshotBeforeUpdate != null) {
				c._snapshot = c.getSnapshotBeforeUpdate(oldProps, oldState);
			}

			diffChildren(
				parentDom,
				newVNode,
				oldVNode,
				context,
				isSvg,
				excessDomChildren,
				oldDom,
				isHydrating
			);

			c.base = newVNode._dom;

			if (clearProcessingException) {
				c._pendingError = c._processingException = null;
			}

			c._force = null;
		} else {
			newVNode._dom = diffElementNodes(
				oldVNode._dom,
				newVNode,
				oldVNode,
				context,
				isSvg,
				excessDomChildren,
				isHydrating
			);
		}
	} catch (e) {
		options._catchError(e, newVNode, old);
	}

	return newVNode._dom;
}

/**
 * Diff two virtual nodes representing DOM element
 * @param {import('../internal').PreactElement} dom The DOM element representing
 * the virtual nodes being diffed
 * @param {import('../internal').VNode} newVNode The new virtual node
 * @param {import('../internal').VNode} oldVNode The old virtual node
 * @param {object} context The current context object
 * @param {boolean} isSvg Whether or not this DOM node is an SVG node
 * @param {*} excessDomChildren
 * @param {boolean} isHydrating Whether or not we are in hydration
 * @returns {import('../internal').PreactElement}
 */
function diffElementNodes(
	dom,
	newVNode,
	oldVNode,
	context,
	isSvg,
	excessDomChildren,
	isHydrating
) {
	let i;
	let oldProps = oldVNode.props;
	let newProps = newVNode.props;

	// Tracks entering and exiting SVG namespace when descending through the tree.
	isSvg = newVNode.type === 'svg' || isSvg;
	if (dom == null && excessDomChildren != null) {
		for (i = 0; i < excessDomChildren.length; i++) {
			const child = excessDomChildren[i];

			if (
				child != null &&
				(newVNode.type === null
					? child.nodeType === 3
					: child.localName === newVNode.type)
			) {
				dom = child;
				excessDomChildren[i] = null;
				break;
			}
		}
	}

	if (newVNode.type === null) {
		if (excessDomChildren != null) {
			excessDomChildren[excessDomChildren.indexOf(dom)] = null;
		}
	} else if (newVNode !== oldVNode) {
		if (excessDomChildren != null && dom) {
			excessDomChildren = EMPTY_ARR.slice.call(dom.childNodes);
		}

		oldProps = oldVNode.props || EMPTY_OBJ;

		let newHtml = newProps.dangerouslySetInnerHTML;

		diffProps(newVNode, newProps, oldProps, isSvg, isHydrating);

		newVNode._children = newVNode.props.children;

		// If the new vnode didn't have dangerouslySetInnerHTML, diff its children
		if (!newHtml) {
			diffChildren(
				dom,
				newVNode,
				oldVNode,
				context,
				newVNode.type === 'foreignObject' ? false : isSvg,
				excessDomChildren,
				EMPTY_OBJ,
				isHydrating
			);
		}
	}

	return dom;
}

/**
 * Invoke or update a ref, depending on whether it is a function or object ref.
 * @param {object|function} ref
 * @param {any} value
 * @param {import('../internal').VNode} vnode
 */
export function applyRef(ref, value, vnode) {
	try {
		if (typeof ref == 'function') ref(value);
		else ref.current = value;
	} catch (e) {
		options._catchError(e, vnode);
	}
}

/**
 * Unmount a virtual node from the tree and apply DOM changes
 * @param {import('../internal').VNode} vnode The virtual node to unmount
 * @param {import('../internal').VNode} parentVNode The parent of the VNode that
 * initiated the unmount
 * @param {boolean} [skipRemove] Flag that indicates that a parent node of the
 * current element is already detached from the DOM.
 */
export function unmount(vnode, parentVNode, skipRemove) {
	let r;
	if (options.unmount) options.unmount(vnode);

	if ((r = vnode.ref)) {
		applyRef(r, null, parentVNode);
	}

	let dom;
	if (!skipRemove && typeof vnode.type !== 'function') {
		skipRemove = (dom = vnode._dom) != null;
	}

	vnode._dom = vnode._lastDomChild = null;

	if ((r = vnode._component) != null) {
		if (r.componentWillUnmount) {
			try {
				r.componentWillUnmount();
			} catch (e) {
				options._catchError(e, parentVNode);
			}
		}

		r.base = r._parentDom = null;
	}

	if ((r = vnode._children)) {
		for (let i = 0; i < r.length; i++) {
			if (r[i]) unmount(r[i], parentVNode, skipRemove);
		}
	}

	console.log('removing', dom);
	if (dom != null) removeNode(dom);
}

/** The `.render()` method for a PFC backing instance. */
function doRender(props, state, context) {
	return this.constructor(props, context);
}
