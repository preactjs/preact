import { EMPTY_OBJ, EMPTY_ARR } from '../constants';
import { Component, enqueueRender } from '../component';
import { coerceToVNode } from '../create-element';
import { diffChildren, toChildArray } from './children';
import { diffProps } from './props';
import { assign, removeNode } from '../util';
import options from '../options';

/**
 * Diff two virtual nodes and apply proper changes to the DOM
 * @param {import('../internal').PreactElement} parentDom The parent of the DOM element
 * @param {import('../internal').VNode | null} newVNode The new virtual node
 * @param {import('../internal').VNode | null} oldVNode The old virtual node
 * @param {object} context The current context object
 * @param {boolean} isSvg Whether or not this element is an SVG node
 * @param {Array<import('../internal').PreactElement>} excessDomChildren
 * @param {Array<import('../internal').Component>} mounts A list of newly
 * mounted components
 * @param {import('../internal').Component | null} ancestorComponent The direct
 * parent component
 * @param {Element | Text} oldDom The current attached DOM
 * element any new dom elements should be placed around. Likely `null` on first
 * render (except when hydrating). Can be a sibling DOM element when diffing
 * Fragments that have siblings. In most cases, it starts out as `oldChildren[0]._dom`.
 */
export function diff(parentDom, newVNode, oldVNode, context, isSvg, excessDomChildren, mounts, ancestorComponent, force, oldDom) {
	let c, tmp, isNew, oldProps, oldState, snapshot,
		newType = newVNode.type, clearProcessingException;

	// When passing through createElement it assigns the object
	// constructor as undefined. This to prevent JSON-injection.
	if (newVNode.constructor !== undefined) return null;

	if (tmp = options.diff) tmp(newVNode);

	try {
		outer: if (typeof newType==='function') {

			// Necessary for createContext api. Setting this property will pass
			// the context value as `this.context` just for this component.
			tmp = newType.contextType;
			let provider = tmp && context[tmp._id];
			let cctx = tmp ? (provider ? provider.props.value : tmp._defaultValue) : context;

			// Get component and set it to `c`
			if (oldVNode._component) {
				c = newVNode._component = oldVNode._component;
				clearProcessingException = c._processingException = c._pendingError;
			}
			else {
				// Instantiate the new component
				if (newType.prototype && newType.prototype.render) {
					newVNode._component = c = new newType(newVNode.props, cctx); // eslint-disable-line new-cap
				}
				else {
					newVNode._component = c = new Component(newVNode.props, cctx);
					c.constructor = newType;
					c.render = doRender;
				}
				c._ancestorComponent = ancestorComponent;
				if (provider) provider.sub(c);

				c.props = newVNode.props;
				if (!c.state) c.state = {};
				c.context = cctx;
				c._context = context;
				isNew = c._dirty = true;
				c._renderCallbacks = [];
			}

			// Invoke getDerivedStateFromProps
			if (c._nextState==null) {
				c._nextState = c.state;
			}
			if (newType.getDerivedStateFromProps!=null) {
				assign(c._nextState==c.state ? (c._nextState = assign({}, c._nextState)) : c._nextState, newType.getDerivedStateFromProps(newVNode.props, c._nextState));
			}

			// Invoke pre-render lifecycle methods
			if (isNew) {
				if (newType.getDerivedStateFromProps==null && c.componentWillMount!=null) c.componentWillMount();
				if (c.componentDidMount!=null) mounts.push(c);
			}
			else {
				if (newType.getDerivedStateFromProps==null && force==null && c.componentWillReceiveProps!=null) {
					c.componentWillReceiveProps(newVNode.props, cctx);
				}

				if (!force && c.shouldComponentUpdate!=null && c.shouldComponentUpdate(newVNode.props, c._nextState, cctx)===false) {
					c.props = newVNode.props;
					c.state = c._nextState;
					c._dirty = false;
					c._vnode = newVNode;
					newVNode._dom = oldVNode._dom;
					newVNode._lastDomChild = oldVNode._lastDomChild;
					newVNode._children = oldVNode._children;
					break outer;
				}

				if (c.componentWillUpdate!=null) {
					c.componentWillUpdate(newVNode.props, c._nextState, cctx);
				}
			}

			oldProps = c.props;
			oldState = c.state;

			c.context = cctx;
			c.props = newVNode.props;
			c.state = c._nextState;

			if (tmp = options.render) tmp(newVNode);

			c._dirty = false;

			try {
				toChildArray(c.render(c.props, c.state, c.context), newVNode._children=[], coerceToVNode, true);
			}
			catch (e) {
				// TODO: Consider modeling this like sCU early exit instead of a direct return.
				// Might be good to copy over some oldVNode properties since the intention of
				// this early exit to say "the DOM hasn't changed" like sCU
				if ((tmp = options.catchRender) && tmp(e, c)) return;
				throw e;
			}

			if (c.getChildContext!=null) {
				context = assign(assign({}, context), c.getChildContext());
			}

			if (!isNew && c.getSnapshotBeforeUpdate!=null) {
				snapshot = c.getSnapshotBeforeUpdate(oldProps, oldState);
			}

			c._depth = ancestorComponent ? (ancestorComponent._depth || 0) + 1 : 0;
			diffChildren(parentDom, newVNode, oldVNode, context, isSvg, excessDomChildren, mounts, c, oldDom);

			// Only change the fields on the component once they represent the new state of the DOM
			c.base = newVNode._dom;
			c._vnode = newVNode;
			c._parentDom = parentDom;

			while (tmp=c._renderCallbacks.pop()) tmp.call(c);

			// Don't call componentDidUpdate on mount or when we bailed out via
			// `shouldComponentUpdate`
			if (!isNew && oldProps!=null && c.componentDidUpdate!=null) {
				c.componentDidUpdate(oldProps, oldState, snapshot);
			}
		}
		else {
			newVNode._dom = diffElementNodes(oldVNode._dom, newVNode, oldVNode, context, isSvg, excessDomChildren, mounts, ancestorComponent);
		}

		if (clearProcessingException) {
			c._pendingError = c._processingException = null;
		}

		if (tmp = options.diffed) tmp(newVNode);
	}
	catch (e) {
		catchErrorInComponent(e, ancestorComponent);
	}

	return newVNode._dom;
}

export function commitRoot(mounts, root) {
	let c;
	while ((c = mounts.pop())) {
		try {
			c.componentDidMount();
		}
		catch (e) {
			catchErrorInComponent(e, c._ancestorComponent);
		}
	}

	if (options.commit) options.commit(root);
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
 * @param {Array<import('../internal').Component>} mounts An array of newly
 * mounted components
 * @param {import('../internal').Component} ancestorComponent The parent
 * component to the ones being diffed
 * @returns {import('../internal').PreactElement}
 */
function diffElementNodes(dom, newVNode, oldVNode, context, isSvg, excessDomChildren, mounts, ancestorComponent) {
	let i;
	let oldProps = oldVNode.props;
	let newProps = newVNode.props;

	// Tracks entering and exiting SVG namespace when descending through the tree.
	isSvg = newVNode.type==='svg' || isSvg;

	if (dom==null && excessDomChildren!=null) {
		for (i=0; i<excessDomChildren.length; i++) {
			const child = excessDomChildren[i];
			if (child!=null && (newVNode.type===null ? child.nodeType===3 : child.localName===newVNode.type)) {
				dom = child;
				excessDomChildren[i] = null;
				break;
			}
		}
	}

	if (dom==null) {
		if (newVNode.type===null) {
			return document.createTextNode(newProps);
		}
		dom = isSvg ? document.createElementNS('http://www.w3.org/2000/svg', newVNode.type) : document.createElement(newVNode.type);
		// we created a new parent, so none of the previously attached children can be reused:
		excessDomChildren = null;
	}

	if (newVNode.type===null) {
		if (oldProps !== newProps) {
			dom.data = newProps;
		}
	}
	else {
		if (excessDomChildren!=null && dom.childNodes!=null) {
			excessDomChildren = EMPTY_ARR.slice.call(dom.childNodes);
		}
		if (newVNode!==oldVNode) {
			let oldProps = oldVNode.props || EMPTY_OBJ;
			let newProps = newVNode.props;

			let oldHtml = oldProps.dangerouslySetInnerHTML;
			let newHtml = newProps.dangerouslySetInnerHTML;
			if ((newHtml || oldHtml) && excessDomChildren==null) {
				// Avoid re-applying the same '__html' if it did not changed between re-render
				if (!newHtml || !oldHtml || newHtml.__html!=oldHtml.__html) {
					dom.innerHTML = newHtml && newHtml.__html || '';
				}
			}
			if (newProps.multiple) {
				dom.multiple = newProps.multiple;
			}

			diffChildren(dom, newVNode, oldVNode, context, newVNode.type==='foreignObject' ? false : isSvg, excessDomChildren, mounts, ancestorComponent, EMPTY_OBJ);
			diffProps(dom, newProps, oldProps, isSvg);
		}
	}

	return dom;
}

/**
 * Invoke or update a ref, depending on whether it is a function or object ref.
 * @param {object|function} ref
 * @param {any} value
 * @param {import('../internal').Component} ancestorComponent
 */
export function applyRef(ref, value, ancestorComponent) {
	try {
		if (typeof ref=='function') ref(value);
		else ref.current = value;
	}
	catch (e) {
		catchErrorInComponent(e, ancestorComponent);
	}
}

/**
 * Unmount a virtual node from the tree and apply DOM changes
 * @param {import('../internal').VNode} vnode The virtual node to unmount
 * @param {import('../internal').Component} ancestorComponent The parent
 * component to this virtual node
 * @param {boolean} [skipRemove] Flag that indicates that a parent node of the
 * current element is already detached from the DOM.
 */
export function unmount(vnode, ancestorComponent, skipRemove) {
	let r;
	if (options.unmount) options.unmount(vnode);

	if (r = vnode.ref) {
		applyRef(r, null, ancestorComponent);
	}

	let dom;
	if (!skipRemove && vnode._lastDomChild==null) {
		skipRemove = (dom = vnode._dom)!=null;
	}

	vnode._dom = vnode._lastDomChild = null;

	if ((r = vnode._component)!=null) {
		if (r.componentWillUnmount) {
			try {
				r.componentWillUnmount();
			}
			catch (e) {
				catchErrorInComponent(e, ancestorComponent);
			}
		}

		r.base = r._parentDom = null;
	}

	if (r = vnode._children) {
		for (let i = 0; i < r.length; i++) {
			if (r[i]) unmount(r[i], ancestorComponent, skipRemove);
		}
	}

	if (dom!=null) removeNode(dom);
}

/** The `.render()` method for a PFC backing instance. */
function doRender(props, state, context) {
	return this.constructor(props, context);
}

/**
 * Find the closest error boundary to a thrown error and call it
 * @param {object} error The thrown value
 * @param {import('../internal').Component} component The first ancestor
 * component check for error boundary behaviors
 */
function catchErrorInComponent(error, component) {
	if (options.catchError) { options.catchError(error, component); }

	for (; component; component = component._ancestorComponent) {
		if (!component._processingException) {
			try {
				if (component.constructor && component.constructor.getDerivedStateFromError!=null) {
					component.setState(component.constructor.getDerivedStateFromError(error));
				}
				else if (component.componentDidCatch!=null) {
					component.componentDidCatch(error);
				}
				else {
					continue;
				}
				return enqueueRender(component._pendingError = component);
			}
			catch (e) {
				error = e;
			}
		}
	}

	throw error;
}
