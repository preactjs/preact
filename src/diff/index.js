import { EMPTY_OBJ, EMPTY_ARR } from '../constants';
import { Component, enqueueRender } from '../component';
import { coerceToVNode, Fragment } from '../create-element';
import { diffChildren } from './children';
import { diffProps } from './props';
import { assign } from '../util';

/**
 * Diff two virtual nodes and apply proper changes to the DOM
 * @param {import('../internal').PreactElement} dom The DOM element representing
 * the virtual nodes under diff
 * @param {import('../internal').PreactElement} parent The parent of the DOM element
 * @param {import('../internal').VNode | null} newTree The new virtual node
 * @param {import('../internal').VNode | null} oldTree The old virtual node
 * @param {object} context The current context object
 * @param {boolean} isSvg Whether or not this element is an SVG node
 * @param {boolean} append Whether or not to immediately append the new DOM
 * element after diffing
 * @param {Array<import('../internal').PreactElement>} excessChildren
 * @param {Array<import('../internal').Component>} mounts A list of newly
 * mounted components
 * @param {import('../internal').Component | null} ancestorComponent The direct
 * parent component
 * @param {import('../internal').VNode} parentVNode Used to set `_lastSibling`
 * pointer to keep track of our current position
 */
export function diff(dom, parent, newTree, oldTree, context, isSvg, append, excessChildren, mounts, ancestorComponent, parentVNode) {

	// If the previous tag doesn't match the new tag we drop the whole subtree
	if (oldTree==null || newTree==null || oldTree.tag!==newTree.tag) {
		if (oldTree!=null) unmount(oldTree, ancestorComponent);
		if (newTree==null) return null;
		dom = null;
		oldTree = EMPTY_OBJ;
	}

	let c, p, isNew = false, oldProps, oldState, oldContext,
		newTag = newTree.tag, lastSibling;

	/** @type {import('../internal').Component | null} */
	let clearProcessingException;

	try {
		let isOldTreeFragment;
		outer: if ((isOldTreeFragment = oldTree.tag === Fragment) || newTag === Fragment) {
			oldTree = oldTree===EMPTY_OBJ ? EMPTY_ARR : !isOldTreeFragment ? [oldTree] : getVNodeChildren(oldTree);
			diffChildren(parent, getVNodeChildren(newTree), oldTree, context, isSvg, excessChildren, mounts, c, newTree);

			// The new dom element for fragments is the first child of the new tree
			// When the first child of a Fragment is passed through `diff()`, it sets its dom
			// element to the parentVNode._el property (that assignment is near the bottom of
			// this function), which is read here.
			dom = newTree._el;
			lastSibling = newTree._lastSibling;
		}
		else if (typeof newTag==='function') {

			// Get component and set it to `c`
			if (oldTree._component) {
				c = newTree._component = oldTree._component;
				clearProcessingException = c._processingException;
			}
			else {
				isNew = true;

				// Instantiate the new component
				if (newTag.prototype && newTag.prototype.render) {
					newTree._component = c = new newTag(newTree.props, context); // eslint-disable-line new-cap
					// @TODO this really shouldn't be necessary and people shouldn't rely on it!
					// Component.call(c, newTree.props, context);
				}
				else {
					newTree._component = c = new Component(newTree.props, context);
					c._constructor = newTag;
					c.render = doRender;
				}
				c._ancestorComponent = ancestorComponent;

				c.props = newTree.props;
				if (!c.state) c.state = {};
				c.context = context;
				c._dirty = true;
				c._renderCallbacks = [];
			}

			c._vnode = newTree;

			// Invoke getDerivedStateFromProps
			let s = c._nextState || c.state;
			if (newTag.getDerivedStateFromProps!=null) {
				oldState = assign({}, c.state);
				if (s===c.state) s = assign({}, s);
				assign(s, newTag.getDerivedStateFromProps(newTree.props, s));
			}

			// Invoke pre-render lifecycle methods
			if (isNew) {
				if (newTag.getDerivedStateFromProps==null && c.componentWillMount!=null) c.componentWillMount();
				mounts.push(c);
			}
			else {
				if (!c._force && c.shouldComponentUpdate!=null && c.shouldComponentUpdate(newTree.props, s, context)===false) {
					break outer;
				}
				if (newTag.getDerivedStateFromProps==null && c.componentWillReceiveProps!=null) {
					c.componentWillReceiveProps(newTree.props, context);
				}

				if (c.componentWillUpdate!=null) {
					c.componentWillUpdate(newTree.props, s, context);
				}
			}

			oldProps = c.props;
			if (!oldState) oldState = c.state;

			oldContext = c.context = context;
			c.props = newTree.props;
			c.state = s;

			let prev = c._previousVTree;
			let vnode = c._previousVTree = coerceToVNode(c.render(c.props, c.state, c.context));
			c._dirty = false;

			if (c.getChildContext!=null) {
				context = assign(assign({}, context), c.getChildContext());
			}

			if (!isNew && c.getSnapshotBeforeUpdate!=null) {
				oldContext = c.getSnapshotBeforeUpdate(oldProps, oldState);
			}

			c.base = dom = diff(dom, parent, vnode, prev, context, isSvg, append, excessChildren, mounts, c, newTree);

			if (vnode!=null) {
				lastSibling = vnode._lastSibling;
			}

			c._parent = parent;
			c._parentVNode = parentVNode;

			if (newTree.ref) applyRef(newTree.ref, c, ancestorComponent);
		}
		else {
			dom = lastSibling = newTree._lastSibling = diffElementNodes(dom, parent, newTree, oldTree, context, isSvg, excessChildren, mounts, ancestorComponent);

			if (newTree.ref && (oldTree.ref !== newTree.ref)) {
				applyRef(newTree.ref, dom, ancestorComponent);
			}
		}

		// Update sibling pointers
		if (parentVNode._el==null) {
			parentVNode._el = dom;
		}

		parentVNode._lastSibling = lastSibling;

		if (parent && append!==false && dom!=null && dom.parentNode!==parent) {
			parent.appendChild(dom);
		}

		newTree._el = dom;

		if (c!=null) {
			while (p=c._renderCallbacks.pop()) p();

			if (!isNew && c.componentDidUpdate!=null) {
				c.componentDidUpdate(oldProps, oldState, oldContext);
			}
		}

		if (clearProcessingException) {
			c._processingException = null;
		}
	}
	catch (e) {
		catchErrorInComponent(e, ancestorComponent);
	}

	return dom;
}

export function flushMounts(mounts) {
	let c;
	while ((c = mounts.pop())) {
		if (c.componentDidMount!=null) {
			try {
				c.componentDidMount();
			}
			catch (e) {
				catchErrorInComponent(e, c._ancestorComponent);
			}
		}
	}
}

/**
 * Diff two virtual nodes representing DOM element
 * @param {import('../internal').PreactElement} dom The DOM element representing
 * the virtual nodes being diffed
 * @param {import('../internal').PreactElement} parent The parent DOM element
 * @param {import('../internal').VNode} vnode The new virtual node
 * @param {import('../internal').VNode} oldVNode The old virtual node
 * @param {object} context The current context object
 * @param {boolean} isSvg Whether or not this DOM node is an SVG node
 * @param {*} excessChildren
 * @param {Array<import('../internal').Component>} mounts An array of newly
 * mounted components
 * @param {import('../internal').Component} ancestorComponent The parent
 * component to the ones being diffed
 * @returns {import('../internal').PreactElement}
 */
function diffElementNodes(dom, parent, vnode, oldVNode, context, isSvg, excessChildren, mounts, ancestorComponent) {
	let d = dom;

	// Tracks entering and exiting SVG namespace when descending through the tree.
	isSvg = isSvg ? vnode.tag !== 'foreignObject' : vnode.tag === 'svg';

	if (dom==null) {
		vnode._el = dom = vnode.tag===null ? document.createTextNode(vnode.text) : isSvg ? document.createElementNS('http://www.w3.org/2000/svg', vnode.tag) : document.createElement(vnode.tag);
	}

	if (vnode.tag===null) {
		if (dom===d && vnode.text!==oldVNode.text) {
			dom.data = vnode.text;
		}
	}
	else {
		if (excessChildren!=null && dom.childNodes!=null) {
			excessChildren = EMPTY_ARR.slice.call(dom.childNodes);
		}
		if (vnode!==oldVNode) {
			diffProps(dom, vnode.props, oldVNode==EMPTY_OBJ ? EMPTY_OBJ : oldVNode.props, isSvg);
		}

		diffChildren(dom, getVNodeChildren(vnode), oldVNode==EMPTY_OBJ ? EMPTY_ARR : getVNodeChildren(oldVNode), context, isSvg, excessChildren, mounts, ancestorComponent, vnode);
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
	if (r = vnode.ref) {
		applyRef(r, null, ancestorComponent);
	}

	if ((r = vnode._el)!=null) r.remove();

	vnode._el = vnode._lastSibling = null;

	if ((r = vnode._component)!=null) {
		if (r.componentWillUnmount) {
			try {
				r.componentWillUnmount();
			}
			catch (e) {
				catchErrorInComponent(e, ancestorComponent);
			}
		}

		r.base = r._parent = null;
		if (r = r._previousVTree) unmount(r, ancestorComponent);
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
 * @param {Array<import('../index').ComponentChild>} [flattened] An flat array of children to modify
 */
export function toChildArray(children, flattened) {
	flattened = flattened || [];
	if (children==null || typeof children === 'boolean' || typeof children === 'function') {}
	else if (Array.isArray(children)) {
		for (let i=0; i < children.length; i++) {
			toChildArray(children[i], flattened);
		}
	}
	else {
		children = coerceToVNode(children);
		flattened.push(children);
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
		if (component.componentDidCatch && !component._processingException) {
			try {
				component.componentDidCatch(error);
				return enqueueRender(component._processingException = component);
			}
			catch (e) {
				error = e;
			}
		}
	}
	throw error;
}
