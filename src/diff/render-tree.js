import { Component, enqueueRender } from '../component';
import { assign } from '../util';
import options from '../options';
import { Fragment, coerceToVNode } from '../create-element';
import { EMPTY_OBJ, EMPTY_ARR } from '../constants';
import { toChildArray } from '..';

/**
 *
 * @param {*} newVNode
 * @param {*} oldVNode
 * @param {*} force
 * @param {*} context
 * @param {*} nesting
 */
export default function renderTree(
	newVNode,
	oldVNode,
	context,
) {
	if (typeof newVNode === 'string' || typeof newVNode === 'number') {
		return newVNode;
	}

	let tmp,
		newType = newVNode.type;

	// TODO: we need to clear this prop at some stage to not leak memory...
	newVNode._oldVNode = oldVNode;

	// JSON injection protection
	if (newVNode.constructor !== undefined) return null;

	// TODO: revisit options callback
	if ((tmp = options._diff)) tmp(newVNode);

	newVNode._used = true;

	try {
		if (typeof newType === 'function') {
			// -------- 1. construction
			let c, isNew, clearProcessingException;
			let newProps = newVNode.props;

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
				if ('prototype' in newType && newType.prototype.render) {
					newVNode._component = c = new newType(newProps, cctx); // eslint-disable-line new-cap
				}
				else {
					newVNode._component = c = new Component(newProps, cctx);
					c.constructor = newType;
					c.render = doRender;
				}

				// createContext support
				if (provider) provider.sub(c);

				c.props = newProps;
				if (!c.state) c.state = {};
				c.context = cctx;
				c._context = context;
				// TODO: the flag _isNew is new, can we get rid of it somehow? If not we should replace isNew if c._isNew in this method...
				isNew = c._dirty = c._isNew = true;
				c._renderCallbacks = [];
			}

			// -------- 2. getDerivedStateFromProps
			// Invoke getDerivedStateFromProps
			if (c._nextState == null) {
				c._nextState = c.state;
			}
			if (newType.getDerivedStateFromProps != null) {
				assign(c._nextState==c.state ? (c._nextState = assign({}, c._nextState)) : c._nextState, newType.getDerivedStateFromProps(newProps, c._nextState));
			}

			// Invoke pre-render lifecycle methods
			if (isNew) {
				// -------- 3a. componentWillMount
				if (newType.getDerivedStateFromProps==null && c.componentWillMount!=null) c.componentWillMount();
				// componentDidMount is now invoked in commit phase
				// if (c.componentDidMount!=null) mounts.push(c);
			}
			else {
				// -------- 3b. componentWillReceiveProps
				if (newType.getDerivedStateFromProps==null && c._force==null && c.componentWillReceiveProps!=null) {
					c.componentWillReceiveProps(newProps, cctx);
				}

				// -------- 4. shouldComponentUpdate
				newVNode._shouldComponentUpdate = c._force || c.shouldComponentUpdate==null || c.shouldComponentUpdate(newProps, c._nextState, cctx)!==false;
				if (!newVNode._shouldComponentUpdate) {
					c.props = newProps;
					c.state = c._nextState;
					c._dirty = false;
					c._vnode = newVNode;
					// TODO: the following line doesn't work anymore as we do not have access to oldDom.
					// I guess it is a viable approach to re-use the oldVNode as newVNode when sCU === false
					// (i.e. `return oldVNode` below) and use referential equality checks in commit to determine
					// whether a node needs to be updated
					// newVNode._dom = oldVNode._dom;
					newVNode._children = oldVNode._children;
					for (tmp = 0; tmp < newVNode._children.length; tmp++) {
						if (newVNode._children[tmp]) newVNode._children[tmp]._parent = newVNode;
					}

					return newVNode;
				}

				// -------- 5. componentWillUpdate
				if (c.componentWillUpdate!=null) {
					c.componentWillUpdate(newProps, c._nextState, cctx);
				}
			}

			// TODO: following vars moved to commit phase, check whether we fill them with the correct values there...
			// oldProps = c.props;
			// oldState = c.state;

			// we newly keep track of _previousState on the component instance as we need this in the commit phase for getSnapshotBeforeUpdate
			c._previousState = c.state;

			c.context = cctx;
			c.props = newProps;
			c.state = c._nextState;

			if ((tmp = options._render)) tmp(newVNode);

			c._dirty = false;
			c._vnode = newVNode;
			// TODO: no more dom in renderTree, check we update _parentDom correctly in commit phase
			// c._parentDom = parentDom;

			tmp = c.render(c.props, c.state, c.context);
			let isTopLevelFragment = tmp != null && tmp.type == Fragment && tmp.key == null;
			newVNode._children = isTopLevelFragment ? tmp.props.children : tmp;

			// TODO: is it safe to call getChildContext before we call the setState callbacks below?!
			if (c.getChildContext != null) {
				context = assign(assign({}, context), c.getChildContext());
			}

			renderChildren(newVNode, oldVNode, context);

			// TODO: what is this base needed for? We don't have any dom here at this stage anymore
			// we might need to set the base during commit
			// c.base = newVNode._dom;

			// TODO: are the setState callbacks at the right position here?
			while (tmp=c._renderCallbacks.pop()) {
				if (c._nextState) { c.state = c._nextState; }
				tmp.call(c);
			}

			if (clearProcessingException) {
				c._pendingError = c._processingException = null;
			}

			c._force = null;
		}
		else {
			// TODO: why do we coerceToVNode here, is this needed? Add a comment :)
			newVNode._children = newVNode.props.children;
			renderChildren(newVNode, oldVNode, context);
		}

		// TODO: revisit options callbacks...
		if (tmp = options.diffed) tmp(newVNode);
	}
	catch (e) {
		options._catchError(e, newVNode, oldVNode);
	}

	return newVNode;
}

function renderChildren(newParentVNode, oldParentVNode, context) {
	let i, j, oldVNode;

	// This is a compression of oldParentVNode!=null && oldParentVNode != EMPTY_OBJ && oldParentVNode._children || EMPTY_ARR
	// as EMPTY_OBJ._children should be `undefined`.
	let oldChildren = ((oldParentVNode && oldParentVNode._children) || EMPTY_ARR).slice();

	let oldChildrenLength = oldChildren.length;

	i=0;
	newParentVNode._children = toChildArray(newParentVNode._children, childVNode => {
		childVNode = coerceToVNode(childVNode);

		if (childVNode!=null) {
			childVNode._parent = newParentVNode;
			childVNode._depth = newParentVNode._depth + 1;

			// Check if we find a corresponding element in oldChildren.
			// If found, delete the array item by setting to `undefined`.
			// We use `undefined`, as `null` is reserved for empty placeholders
			// (holes).
			oldVNode = oldChildren[i];

			if (oldVNode===null || (oldVNode && childVNode.key == oldVNode.key && childVNode.type === oldVNode.type)) {
				oldChildren[i] = undefined;
			}
			else {
				// Either oldVNode === undefined or oldChildrenLength > 0,
				// so after this loop oldVNode == null or oldVNode is a valid value.
				for (j=0; j<oldChildrenLength; j++) {
					oldVNode = oldChildren[j];
					// If childVNode is unkeyed, we only match similarly unkeyed nodes, otherwise we match by key.
					// We always match by type (in either case).
					if (oldVNode && childVNode.key == oldVNode.key && childVNode.type === oldVNode.type) {
						oldChildren[j] = undefined;
						break;
					}
					oldVNode = null;
				}
			}

			oldVNode = oldVNode || EMPTY_OBJ;

			childVNode = renderTree(childVNode, oldVNode, context);
		}

		i++;

		return childVNode;
	});
}

/** The `.render()` method for a PFC backing instance. */
function doRender(props, state, context) {
	return this.constructor(props, context);
}

(options)._catchError = function (error, vnode, oldVNode) {

	/** @type {import('../internal').Component} */
	let component;

	for (; vnode = vnode._parent;) {
		if ((component = vnode._component) && !component._processingException) {
			try {
				if (component.constructor && component.constructor.getDerivedStateFromError != null) {
					component.setState(component.constructor.getDerivedStateFromError(error));
				}
				else if (component.componentDidCatch != null) {
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
};