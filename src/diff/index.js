import { EMPTY_OBJ, EMPTY_ARR } from '../constants';
import { Component, enqueueRender } from '../component';
import { coerceToVNode, Fragment } from '../create-element';
import { toChildArray } from './children';
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
 * @param {Element | Text} oldDom The current attached DOM
 * element any new dom elements should be placed around. Likely `null` on first
 * render (except when hydrating). Can be a sibling DOM element when diffing
 * Fragments that have siblings. In most cases, it starts out as `oldChildren[0]._dom`.
 */
export function diff(parentDom, newVNode, oldVNode, context, isSvg, excessDomChildren, mounts, force, oldDom, newParentVNode) {
	let c, tmp, isNew, oldState, snapshot, clearProcessingException;
	let oldProps, newProps;
	let newType = newVNode.type;

	let isArray = Array.isArray(newVNode);
	let childVNode, i, j, oldChildVNode, newDom, sibDom, firstChildDom, refs;

	// When passing through createElement it assigns the object
	// constructor as undefined. This to prevent JSON-injection.
	if (!isArray && newVNode.constructor !== undefined) return null;

	if (tmp = options._diff) tmp(newVNode);

	try {
		outer: if (isArray) {
			// return diffChildren(parentDom, newVNode, oldVNode, context, isSvg, excessDomChildren, mounts, oldDom, newParentVNode);

			// This is a compression of oldParentVNode!=null && oldParentVNode != EMPTY_OBJ && oldParentVNode._children || EMPTY_ARR
			// as EMPTY_OBJ._children should be `undefined`.
			oldVNode = oldVNode || EMPTY_ARR;

			let oldChildrenLength = oldVNode.length;

			// Only in very specific places should this logic be invoked (top level `render` and `diffElementNodes`).
			// I'm using `EMPTY_OBJ` to signal when `diffChildren` is invoked in these situations. I can't use `null`
			// for this purpose, because `null` is a valid value for `oldDom` which can mean to skip to this logic
			// (e.g. if mounting a new tree in which the old DOM should be ignored (usually for Fragments).
			if (oldDom == EMPTY_OBJ) {
				oldDom = null;
				if (excessDomChildren!=null) {
					oldDom = excessDomChildren[0];
				}
				else {
					for (i = 0; !oldDom && i < oldChildrenLength; i++) {
						oldDom = oldVNode[i] && oldVNode[i]._dom;
					}
				}
			}

			for (i=0; i<newVNode.length; i++) {
				childVNode = newVNode[i] = coerceToVNode(newVNode[i]);

				if (childVNode!=null) {
					childVNode._parent = newParentVNode;
					childVNode._depth = newParentVNode._depth + 1;

					// Check if we find a corresponding element in oldChildren.
					// If found, delete the array item by setting to `undefined`.
					// We use `undefined`, as `null` is reserved for empty placeholders
					// (holes).
					oldChildVNode = oldVNode[i];

					if (oldChildVNode===null || (oldChildVNode && childVNode.key == oldChildVNode.key && childVNode.type === oldChildVNode.type)) {
						oldVNode[i] = undefined;
					}
					else {
						// Either oldVNode === undefined or oldChildrenLength > 0,
						// so after this loop oldVNode == null or oldVNode is a valid value.
						for (j=0; j<oldChildrenLength; j++) {
							oldChildVNode = oldVNode[j];
							// If childVNode is unkeyed, we only match similarly unkeyed nodes, otherwise we match by key.
							// We always match by type (in either case).
							if (oldChildVNode && childVNode.key == oldChildVNode.key && childVNode.type === oldChildVNode.type) {
								oldVNode[j] = undefined;
								break;
							}
							oldChildVNode = null;
						}
					}

					oldChildVNode = oldChildVNode || EMPTY_OBJ;

					// Morph the old element into the new one, but don't append it to the dom yet
					newDom = diff(parentDom, childVNode, oldChildVNode, context, isSvg, excessDomChildren, mounts, null, oldDom, newParentVNode);

					if ((j = childVNode.ref) && oldChildVNode.ref != j) {
						(refs || (refs=[])).push(j, childVNode._component || newDom);
					}

					// Only proceed if the vnode has not been unmounted by `diff()` above.
					if (newDom!=null) {
						if (firstChildDom == null) {
							firstChildDom = newDom;
						}

						if (childVNode._lastDomChild != null) {
							// Only Fragments or components that return Fragment like VNodes will
							// have a non-null _lastDomChild. Continue the diff from the end of
							// this Fragment's DOM tree.
							newDom = childVNode._lastDomChild;

							// Eagerly cleanup _lastDomChild. We don't need to persist the value because
							// it is only used by `diffChildren` to determine where to resume the diff after
							// diffing Components and Fragments.
							childVNode._lastDomChild = null;
						}
						else if (excessDomChildren==oldChildVNode || newDom!=oldDom || newDom.parentNode==null) {
							// NOTE: excessDomChildren==oldVNode above:
							// This is a compression of excessDomChildren==null && oldVNode==null!
							// The values only have the same type when `null`.

							outer2: if (oldDom==null || oldDom.parentNode!==parentDom) {
								parentDom.appendChild(newDom);
							}
							else {
								// `j<oldChildrenLength; j+=2` is an alternative to `j++<oldChildrenLength/2`
								for (sibDom=oldDom, j=0; (sibDom=sibDom.nextSibling) && j<oldChildrenLength; j+=2) {
									if (sibDom==newDom) {
										break outer2;
									}
								}
								parentDom.insertBefore(newDom, oldDom);
							}
						}

						oldDom = newDom.nextSibling;

						if (typeof newParentVNode.type == 'function') {
							// At this point, if childVNode._lastDomChild existed, then
							// newDom = childVNode._lastDomChild per line 101. Else it is
							// the same as childVNode._dom, meaning this component returned
							// only a single DOM node
							newParentVNode._lastDomChild = newDom;
						}
					}
				}
			}

			newParentVNode._dom = firstChildDom;

			// Remove children that are not part of any vnode.
			if (excessDomChildren!=null && typeof newParentVNode.type !== 'function') for (i=excessDomChildren.length; i--; ) if (excessDomChildren[i]!=null) removeNode(excessDomChildren[i]);

			// Remove remaining oldChildren if there are any.
			for (i=oldChildrenLength; i--; ) if (oldVNode[i]!=null) unmount(oldVNode[i], newParentVNode);

			// Set refs only after unmount
			if (refs) {
				for (i = 0; i < refs.length; i++) {
					applyRef(refs[i], refs[++i], newParentVNode);
				}
			}
		}
		else if (typeof newType==='function') {
			newProps = newVNode.props;

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
					newVNode._component = c = new newType(newProps, cctx); // eslint-disable-line new-cap
				}
				else {
					newVNode._component = c = new Component(newProps, cctx);
					c.constructor = newType;
					c.render = doRender;
				}
				if (provider) provider.sub(c);

				c.props = newProps;
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
				assign(c._nextState==c.state ? (c._nextState = assign({}, c._nextState)) : c._nextState, newType.getDerivedStateFromProps(newProps, c._nextState));
			}

			// Invoke pre-render lifecycle methods
			if (isNew) {
				if (newType.getDerivedStateFromProps==null && c.componentWillMount!=null) c.componentWillMount();
				if (c.componentDidMount!=null) mounts.push(c);
			}
			else {
				if (newType.getDerivedStateFromProps==null && force==null && c.componentWillReceiveProps!=null) {
					c.componentWillReceiveProps(newProps, cctx);
				}

				if (!force && c.shouldComponentUpdate!=null && c.shouldComponentUpdate(newProps, c._nextState, cctx)===false) {
					c.props = newProps;
					c.state = c._nextState;
					c._dirty = false;
					c._vnode = newVNode;
					newVNode._dom = oldVNode._dom;
					newVNode._children = oldVNode._children;
					break outer;
				}

				if (c.componentWillUpdate!=null) {
					c.componentWillUpdate(newProps, c._nextState, cctx);
				}
			}

			oldProps = c.props;
			oldState = c.state;

			c.context = cctx;
			c.props = newProps;
			c.state = c._nextState;

			if (tmp = options._render) tmp(newVNode);

			c._dirty = false;

			try {
				tmp = c.render(c.props, c.state, c.context);
				let isTopLevelFragment = tmp != null && tmp.type == Fragment && tmp.key == null;
				toChildArray(isTopLevelFragment ? tmp.props.children : tmp, newVNode._children=[], coerceToVNode, true);
			}
			catch (e) {
				if ((tmp = options._catchRender) && tmp(e, newVNode, oldVNode)) break outer;
				throw e;
			}

			if (c.getChildContext!=null) {
				context = assign(assign({}, context), c.getChildContext());
			}

			if (!isNew && c.getSnapshotBeforeUpdate!=null) {
				snapshot = c.getSnapshotBeforeUpdate(oldProps, oldState);
			}

			diff(parentDom, newVNode._children, oldVNode && oldVNode._children, context, isSvg, excessDomChildren, mounts, force, oldDom, newVNode);

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

			if (clearProcessingException) {
				c._pendingError = c._processingException = null;
			}
		}
		else {
			oldProps = oldVNode.props;
			newProps = newVNode.props;

			// This VNode's DOM node is the new parentDom
			parentDom = oldVNode._dom;

			// Tracks entering and exiting SVG namespace when descending through the tree.
			isSvg = newType==='svg' || isSvg;

			if (parentDom==null && excessDomChildren!=null) {
				for (let i=0; i<excessDomChildren.length; i++) {
					const child = excessDomChildren[i];
					if (child!=null && (newType===null ? child.nodeType===3 : child.localName===newType)) {
						parentDom = child;
						excessDomChildren[i] = null;
						break;
					}
				}
			}

			if (parentDom==null) {
				if (newType===null) {
					newVNode._dom = document.createTextNode(newProps);
					break outer;
				}
				parentDom = isSvg ? document.createElementNS('http://www.w3.org/2000/svg', newType) : document.createElement(newType);
				// we created a new parent, so none of the previously attached children can be reused:
				excessDomChildren = null;
			}

			if (newType===null) {
				if (oldProps !== newProps) {
					parentDom.data = newProps;
				}
			}
			else if (newVNode!==oldVNode) {
				if (excessDomChildren!=null) {
					excessDomChildren = EMPTY_ARR.slice.call(parentDom.childNodes);
				}

				oldProps = oldVNode.props || EMPTY_OBJ;

				let oldHtml = oldProps.dangerouslySetInnerHTML;
				let newHtml = newProps.dangerouslySetInnerHTML;
				if ((newHtml || oldHtml) && excessDomChildren==null) {
					// Avoid re-applying the same '__html' if it did not changed between re-render
					if (!newHtml || !oldHtml || newHtml.__html!=oldHtml.__html) {
						parentDom.innerHTML = newHtml && newHtml.__html || '';
					}
				}
				if (newProps.multiple) {
					parentDom.multiple = newProps.multiple;
				}

				toChildArray(newVNode.props.children, newVNode._children=[], coerceToVNode, true);
				diff(parentDom, newVNode._children, oldVNode && oldVNode._children, context, newType==='foreignObject' ? false : isSvg, excessDomChildren, mounts, force, EMPTY_OBJ, newVNode);
				diffProps(parentDom, newProps, oldProps, isSvg);
			}

			newVNode._dom = parentDom;
		}

		if (tmp = options.diffed) tmp(newVNode);
	}
	catch (e) {
		catchErrorInComponent(e, newVNode._parent);
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
			catchErrorInComponent(e, c._vnode._parent);
		}
	}

	if (options._commit) options._commit(root);
}

/**
 * Invoke or update a ref, depending on whether it is a function or object ref.
 * @param {object|function} ref
 * @param {any} value
 * @param {import('../internal').VNode} parentVNode
 */
export function applyRef(ref, value, parentVNode) {
	try {
		if (typeof ref=='function') ref(value);
		else ref.current = value;
	}
	catch (e) {
		catchErrorInComponent(e, parentVNode);
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

	if (r = vnode.ref) {
		applyRef(r, null, parentVNode);
	}

	let dom;
	if (!skipRemove && typeof vnode.type !== 'function') {
		skipRemove = (dom = vnode._dom)!=null;
	}

	vnode._dom = vnode._lastDomChild = null;

	if ((r = vnode._component)!=null) {
		if (r.componentWillUnmount) {
			try {
				r.componentWillUnmount();
			}
			catch (e) {
				catchErrorInComponent(e, parentVNode);
			}
		}

		r.base = r._parentDom = null;
	}

	if (r = vnode._children) {
		for (let i = 0; i < r.length; i++) {
			if (r[i]) unmount(r[i], parentVNode, skipRemove);
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
 * @param {import('../internal').VNode} vnode The first ancestor
 * VNode check for error boundary behaviors
 */
function catchErrorInComponent(error, vnode) {
	if (options._catchError) { options._catchError(error, vnode); }

	/** @type {import('../internal').Component} */
	let component;

	for (; vnode; vnode = vnode._parent) {
		if ((component = vnode._component) && !component._processingException) {
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
