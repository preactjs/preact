import { EMPTY_OBJ, EMPTY_ARR } from '../constants';
import { Component, enqueueRender } from '../component';
import { coerceToVNode, Fragment } from '../create-element';
import { diffChildren } from './children';
import { diffProps } from './props';
import { assign } from '../util';
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
 * @param {boolean} append Whether or not to immediately append the new DOM
 * element after diffing
 * @param {Array<import('../internal').PreactElement>} excessDomChildren
 * @param {Array<import('../internal').Component>} mounts A list of newly
 * mounted components
 * @param {import('../internal').Component | null} ancestorComponent The direct
 * parent component
 * @param {import('../internal').VNode} parentVNode Used to set `_lastDomChild`
 * pointer to keep track of our current position
 */
export function diff(dom, parentDom, newVNode, oldVNode, context, isSvg, append, excessDomChildren, mounts, ancestorComponent, parentVNode) {

	// If the previous type doesn't match the new type we drop the whole subtree
	if (oldVNode==null || newVNode==null || oldVNode.type!==newVNode.type) {
		if (oldVNode!=null) unmount(oldVNode, ancestorComponent);
		if (newVNode==null) return null;
		dom = null;
		oldVNode = EMPTY_OBJ;
	}

	if (options.beforeDiff) options.beforeDiff(newVNode);

	let c, p, isNew = false, oldProps, oldState, oldContext,
		newType = newVNode.type, lastDomChild;

	/** @type {import('../internal').Component | null} */
	let clearProcessingException;

	try {
		const isOldVNodeFragment = oldVNode.type===Fragment;

		outer: if (isOldVNodeFragment || newType===Fragment) {
			const oldVNodeChildren = oldVNode===EMPTY_OBJ ? EMPTY_ARR : !isOldVNodeFragment ? [oldVNode] : getVNodeChildren(oldVNode);

			let childDom = oldVNode._dom;
			if (excessDomChildren!=null) {
				for (let i = 0; i < excessDomChildren.length; i++) {
					if (excessDomChildren[i]!=null) {
						childDom = excessDomChildren[i];
						break;
					}
				}
			}

			diffChildren(parentDom, getVNodeChildren(newVNode), oldVNodeChildren, context, isSvg, excessDomChildren, mounts, c, newVNode, childDom);

			// The new dom element for fragments is the first child of the new tree
			// When the first child of a Fragment is passed through `diff()`, it sets its dom
			// element to the parentVNode._dom property (that assignment is near the bottom of
			// this function), which is read here.
			dom = newVNode._dom;
			lastDomChild = newVNode._lastDomChild;
		}
		else if (typeof newType==='function') {

			// Get component and set it to `c`
			if (oldVNode._component) {
				c = newVNode._component = oldVNode._component;
				clearProcessingException = c._processingException;
			}
			else {
				isNew = true;

				// Instantiate the new component
				if (newType.prototype && newType.prototype.render) {
					newVNode._component = c = new newType(newVNode.props, context); // eslint-disable-line new-cap
				}
				else {
					newVNode._component = c = new Component(newVNode.props, context);
					c._constructor = newType;
					c.render = doRender;
				}
				c._ancestorComponent = ancestorComponent;

				c.props = newVNode.props;
				if (!c.state) c.state = {};
				c.context = context;
				c._dirty = true;
				c._renderCallbacks = [];
			}

			c._vnode = newVNode;

			// Invoke getDerivedStateFromProps
			let s = c._nextState || c.state;
			if (newType.getDerivedStateFromProps!=null) {
				oldState = assign({}, c.state);
				if (s===c.state) s = assign({}, s);
				assign(s, newType.getDerivedStateFromProps(newVNode.props, s));
			}

			// Invoke pre-render lifecycle methods
			if (isNew) {
				if (newType.getDerivedStateFromProps==null && c.componentWillMount!=null) c.componentWillMount();
				if (c.componentDidMount!=null) mounts.push(c);
			}
			else {
				if (!c._force && c.shouldComponentUpdate!=null && c.shouldComponentUpdate(newVNode.props, s, context)===false) {
					c._dirty = false;
					break outer;
				}
				if (newType.getDerivedStateFromProps==null && c._force==null && c.componentWillReceiveProps!=null) {
					c.componentWillReceiveProps(newVNode.props, context);
				}

				if (c.componentWillUpdate!=null) {
					c.componentWillUpdate(newVNode.props, s, context);
				}
			}

			oldProps = c.props;
			if (!oldState) oldState = c.state;

			oldContext = c.context = context;
			c.props = newVNode.props;
			c.state = s;

			if (options.beforeRender) options.beforeRender(newVNode);

			let prev = c._prevVNode;
			let vnode = c._prevVNode = coerceToVNode(c.render(c.props, c.state, c.context));
			c._dirty = false;

			if (c.getChildContext!=null) {
				context = assign(assign({}, context), c.getChildContext());
			}

			if (!isNew && c.getSnapshotBeforeUpdate!=null) {
				oldContext = c.getSnapshotBeforeUpdate(oldProps, oldState);
			}

			c.base = dom = diff(dom, parentDom, vnode, prev, context, isSvg, append, excessDomChildren, mounts, c, newVNode);

			if (vnode!=null) {
				newVNode._wrapsFragment = vnode.type === Fragment || vnode._wrapsFragment;
				lastDomChild = vnode._lastDomChild;
			}

			c._parentDom = parentDom;
			c._parentVNode = parentVNode;

			if (newVNode.ref) applyRef(newVNode.ref, c, ancestorComponent);
		}
		else {
			dom = lastDomChild = newVNode._lastDomChild = diffElementNodes(dom, newVNode, oldVNode, context, isSvg, excessDomChildren, mounts, ancestorComponent);

			if (newVNode.ref && (oldVNode.ref !== newVNode.ref)) {
				applyRef(newVNode.ref, dom, ancestorComponent);
			}
		}

		// Update dom pointers
		if (parentVNode._dom==null) {
			parentVNode._dom = dom;
		}

		parentVNode._lastDomChild = lastDomChild;

		if (parentDom && append!==false && dom!=null && dom.parentNode!==parentDom) {
			parentDom.appendChild(dom);
		}

		newVNode._dom = dom;

		if (c!=null) {
			while (p=c._renderCallbacks.pop()) p();

			// Don't call componentDidUpdate on mount or when we bailed out via
			// `shouldComponentUpdate`
			if (!isNew && oldProps!=null && c.componentDidUpdate!=null) {
				c.componentDidUpdate(oldProps, oldState, oldContext);
			}
		}

		if (clearProcessingException) {
			c._processingException = null;
		}

		if (options.afterDiff) options.afterDiff(newVNode);
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

	if (options.commitRoot) options.commitRoot(root);
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
	isSvg = isSvg ? newVNode.type !== 'foreignObject' : newVNode.type === 'svg';

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
		if (dom===d && newVNode.text!==oldVNode.text) {
			dom.data = newVNode.text;
		}
	}
	else {
		if (excessDomChildren!=null && dom.childNodes!=null) {
			excessDomChildren = EMPTY_ARR.slice.call(dom.childNodes);
		}
		if (newVNode!==oldVNode) {
			let oldProps = oldVNode.props;
			// if we're hydrating, use the element's attributes as its current props:
			if (oldProps==null) {
				oldProps = {};
				if (excessDomChildren!=null) {
					for (let i=0; i<dom.attributes.length; i++) {
						oldProps[dom.attributes[i].name] = dom.attributes[i].value;
					}
				}
			}
			diffProps(dom, newVNode.props, oldProps, isSvg);
		}

		diffChildren(dom, getVNodeChildren(newVNode), oldVNode==EMPTY_OBJ ? EMPTY_ARR : getVNodeChildren(oldVNode), context, isSvg, excessDomChildren, mounts, ancestorComponent, newVNode, dom.firstChild);
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
 */
export function unmount(vnode, ancestorComponent) {
	let r;
	if (options.beforeUnmount) options.beforeUnmount(vnode);

	if (r = vnode.ref) {
		applyRef(r, null, ancestorComponent);
	}

	if ((r = vnode._dom)!=null) r.remove();

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
		if (r = r._prevVNode) unmount(r, ancestorComponent);
	}
	else if (r = vnode._children) {
		for (let i = 0; i < r.length; i++) {
			unmount(r[i], ancestorComponent);
		}
	}
}

/**
 * Get the children of a virtual node as a flat array
 * @param {import('../internal').VNode} vnode The virtual node to get the
 * children of
 * @returns {Array<import('../internal').VNode>} The virtual node's children
 */
function getVNodeChildren(vnode) {
	if (vnode._children==null) {
		toChildArray(vnode.props.children, vnode._children=[]);
	}
	return vnode._children;
}


/**
 * Flatten a virtual nodes children to a single dimensional array
 * @param {import('../index').ComponentChildren} children The unflattened
 * children of a virtual node
 * @param {Array<import('../index').VNode | null>} [flattened] An flat array of children to modify
 */
export function toChildArray(children, flattened) {
	if (flattened===undefined) flattened = [];
	if (children==null || typeof children === 'boolean') {}
	else if (Array.isArray(children)) {
		for (let i=0; i < children.length; i++) {
			toChildArray(children[i], flattened);
		}
	}
	else {
		flattened.push(coerceToVNode(children));
	}

	return flattened;
}

/** The `.render()` method for a PFC backing instance. */
function doRender(props, state, context) {
	return this._constructor(props, context);
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
