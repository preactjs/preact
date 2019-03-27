import { EMPTY_OBJ, EMPTY_ARR } from '../constants';
import { Component, enqueueRender } from '../component';
import { coerceToVNode, Fragment } from '../create-element';
import { diffChildren } from './children';
import { diffProps } from './props';
import { assign, removeNode } from '../util';
import options from '../options';

/**
 * Diff two virtual nodes and apply proper changes to the DOM
 * @param {import('../internal').PreactElement | Text} dom The DOM element representing
 * the virtual nodes under diff
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
 */
export function diff(dom, parentDom, newVNode, oldVNode, context, isSvg, excessDomChildren, mounts, ancestorComponent, force) {

	// If the previous type doesn't match the new type we drop the whole subtree
	if (oldVNode==null || newVNode==null || oldVNode.type!==newVNode.type) {
		if (oldVNode!=null) unmount(oldVNode, ancestorComponent);
		if (newVNode==null) return null;
		dom = null;
		oldVNode = EMPTY_OBJ;
	}

	if (options.diff) options.diff(newVNode);

	let c, p, isNew = false, oldProps, oldState, snapshot,
		newType = newVNode.type;

	/** @type {import('../internal').Component | null} */
	let clearProcessingException;

	try {
		outer: if (oldVNode.type===Fragment || newType===Fragment) {
			diffChildren(parentDom, newVNode, oldVNode, context, isSvg, excessDomChildren, mounts, c);

			if (newVNode._children.length) {
				dom = newVNode._children[0]._dom;
				newVNode._lastDomChild = newVNode._children[newVNode._children.length - 1]._dom;
			}
		}
		else if (typeof newType==='function') {

			// Necessary for createContext api. Setting this property will pass
			// the context value as `this.context` just for this component.
			let cxType = newType.contextType;
			let provider = cxType && context[cxType._id];
			let cctx = cxType != null ? (provider ? provider.props.value : cxType._defaultValue) : context;

			// Get component and set it to `c`
			if (oldVNode._component) {
				c = newVNode._component = oldVNode._component;
				clearProcessingException = c._processingException;
			}
			else {
				isNew = true;

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
				c._dirty = true;
				c._renderCallbacks = [];
			}

			c._vnode = newVNode;

			// Invoke getDerivedStateFromProps
			let s = c._nextState || c.state;
			if (newType.getDerivedStateFromProps!=null) {
				oldState = assign({}, c.state);
				if (s===c.state) s = c._nextState = assign({}, s);
				assign(s, newType.getDerivedStateFromProps(newVNode.props, s));
			}

			// Invoke pre-render lifecycle methods
			if (isNew) {
				if (newType.getDerivedStateFromProps==null && c.componentWillMount!=null) c.componentWillMount();
				if (c.componentDidMount!=null) mounts.push(c);
			}
			else {
				if (newType.getDerivedStateFromProps==null && force==null && c.componentWillReceiveProps!=null) {
					c.componentWillReceiveProps(newVNode.props, cctx);
					s = c._nextState || c.state;
				}

				if (!force && c.shouldComponentUpdate!=null && c.shouldComponentUpdate(newVNode.props, s, cctx)===false) {
					c.props = newVNode.props;
					c.state = s;
					c._dirty = false;
					break outer;
				}

				if (c.componentWillUpdate!=null) {
					c.componentWillUpdate(newVNode.props, s, cctx);
				}
			}

			oldProps = c.props;
			if (!oldState) oldState = c.state;

			c.context = cctx;
			c.props = newVNode.props;
			c.state = s;

			if (options.render) options.render(newVNode);

			let prev = c._prevVNode;
			let vnode = c._prevVNode = coerceToVNode(c.render(c.props, c.state, c.context));
			c._dirty = false;

			if (c.getChildContext!=null) {
				context = assign(assign({}, context), c.getChildContext());
			}

			if (!isNew && c.getSnapshotBeforeUpdate!=null) {
				snapshot = c.getSnapshotBeforeUpdate(oldProps, oldState);
			}

			c.base = dom = diff(dom, parentDom, vnode, prev, context, isSvg, excessDomChildren, mounts, c, null);

			if (vnode!=null) {
				// If this component returns a Fragment (or another component that
				// returns a Fragment), then _lastDomChild will be non-null,
				// informing `diffChildren` to diff this component's VNode like a Fragemnt
				newVNode._lastDomChild = vnode._lastDomChild;
			}

			c._parentDom = parentDom;

			if (newVNode.ref) applyRef(newVNode.ref, c, ancestorComponent);
		}
		else {
			dom = diffElementNodes(dom, newVNode, oldVNode, context, isSvg, excessDomChildren, mounts, ancestorComponent);

			if (newVNode.ref && (oldVNode.ref !== newVNode.ref)) {
				applyRef(newVNode.ref, dom, ancestorComponent);
			}
		}

		newVNode._dom = dom;

		if (c!=null) {
			while (p=c._renderCallbacks.pop()) p.call(c);

			// Don't call componentDidUpdate on mount or when we bailed out via
			// `shouldComponentUpdate`
			if (!isNew && oldProps!=null && c.componentDidUpdate!=null) {
				c.componentDidUpdate(oldProps, oldState, snapshot);
			}
		}

		if (clearProcessingException) {
			c._processingException = null;
		}

		if (options.diffed) options.diffed(newVNode);
	}
	catch (e) {
		catchErrorInComponent(e, ancestorComponent);
	}

	return dom;
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
	let d = dom;

	// Tracks entering and exiting SVG namespace when descending through the tree.
	isSvg = newVNode.type==='svg' || isSvg;

	if (dom==null && excessDomChildren!=null) {
		for (let i=0; i<excessDomChildren.length; i++) {
			const child = excessDomChildren[i];
			if (child!=null && (newVNode.type===null ? child.nodeType===3 : child.localName===newVNode.type)) {
				dom = child;
				excessDomChildren[i] = null;
				break;
			}
		}
	}

	if (dom==null) {
		dom = newVNode.type===null ? document.createTextNode(newVNode.text) : isSvg ? document.createElementNS('http://www.w3.org/2000/svg', newVNode.type) : document.createElement(newVNode.type);

		// we created a new parent, so none of the previously attached children can be reused:
		excessDomChildren = null;
	}
	newVNode._dom = dom;

	if (newVNode.type===null) {
		if ((d===null || dom===d) && newVNode.text!==oldVNode.text) {
			dom.data = newVNode.text;
		}
	}
	else {
		if (excessDomChildren!=null && dom.childNodes!=null) {
			excessDomChildren = EMPTY_ARR.slice.call(dom.childNodes);
		}
		if (newVNode!==oldVNode) {
			let oldProps = oldVNode.props;
			let newProps = newVNode.props;

			// if we're hydrating, use the element's attributes as its current props:
			if (oldProps==null) {
				oldProps = {};
				if (excessDomChildren!=null) {
					let name;
					for (let i=0; i<dom.attributes.length; i++) {
						name = dom.attributes[i].name;
						oldProps[name=='class' && newProps.className ? 'className' : name] = dom.attributes[i].value;
					}
				}
			}
			let oldHtml = oldProps.dangerouslySetInnerHTML;
			let newHtml = newProps.dangerouslySetInnerHTML;
			if (newHtml || oldHtml) {
				// Avoid re-applying the same '__html' if it did not changed between re-render
				if (!newHtml || !oldHtml || newHtml.__html!=oldHtml.__html) {
					dom.innerHTML = newHtml && newHtml.__html || '';
				}
			}
			if (newProps.multiple) {
				dom.multiple = newProps.multiple;
			}
			diffChildren(dom, newVNode, oldVNode, context, newVNode.type==='foreignObject' ? false : isSvg, excessDomChildren, mounts, ancestorComponent);
			diffProps(dom, newProps, oldProps, isSvg);
		}
	}

	return dom;
}

/**
 * Invoke or update a ref, depending on whether it is a function or object ref.
 * @param {object|function} [ref=null]
 * @param {any} [value]
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
 * @param {boolean} skipRemove Flag that indicates that a parent node of the
 * current element is already detached from the DOM.
 */
export function unmount(vnode, ancestorComponent, skipRemove) {
	let r;
	if (options.unmount) options.unmount(vnode);

	if (r = vnode.ref) {
		applyRef(r, null, ancestorComponent);
	}

	if (!skipRemove && vnode._lastDomChild==null && (skipRemove = ((r = vnode._dom)!=null))) removeNode(r);

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
		if (r = r._prevVNode) unmount(r, ancestorComponent, skipRemove);
	}
	else if (r = vnode._children) {
		for (let i = 0; i < r.length; i++) {
			unmount(r[i], ancestorComponent, skipRemove);
		}
	}
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
	for (; component; component = component._ancestorComponent) {
		if (!component._processingException) {
			try {
				if (component.constructor.getDerivedStateFromError!=null) {
					component.setState(component.constructor.getDerivedStateFromError(error));
				}
				else if (component.componentDidCatch!=null) {
					component.componentDidCatch(error);
				}
				else {
					continue;
				}
				return enqueueRender(component._processingException = component);
			}
			catch (e) {
				error = e;
			}
		}
	}
	throw error;
}
