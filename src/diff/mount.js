import { applyRef } from './index';
import { EMPTY_ARR } from '../constants';
import { Component } from '../component';
import { Fragment, normalizeToVNode } from '../create-element';
import { setProperty } from './props';
import { assign, removeNode } from '../util';
import options from '../options';

/**
 * Diff two virtual nodes and apply proper changes to the DOM
 * @param {import('../internal').PreactElement} parentDom The parent of the DOM element
 * @param {import('../internal').VNode} newVNode The new virtual node
 * @param {object} globalContext The current context object. Modified by getChildContext
 * @param {boolean} isSvg Whether or not this element is an SVG node
 * @param {Array<import('../internal').PreactElement>} excessDomChildren
 * @param {Array<import('../internal').Component>} commitQueue List of components
 * which have callbacks to invoke in commitRoot
 * @param {import('../internal').PreactElement} oldDom The current attached DOM
 * element any new dom elements should be placed around. Likely `null` on first
 * render (except when hydrating). Can be a sibling DOM element when diffing
 * Fragments that have siblings. In most cases, it starts out as `oldChildren[0]._dom`.
 * @param {boolean} [isHydrating] Whether or not we are in hydration
 */
export function mount(
	parentDom,
	newVNode,
	globalContext,
	isSvg,
	excessDomChildren,
	commitQueue,
	oldDom,
	isHydrating
) {
	let tmp,
		newType = newVNode.type;

	// When passing through createElement it assigns the object
	// constructor as undefined. This to prevent JSON-injection.
	if (newVNode.constructor !== undefined) return null;

	// // If the previous diff bailed out, resume creating/hydrating.
	// if (oldVNode._hydrating != null) {
	// 	isHydrating = oldVNode._hydrating;
	// 	oldDom = newVNode._dom = oldVNode._dom;
	// 	// if we resume, we want the tree to be "unlocked"
	// 	newVNode._hydrating = null;
	// 	excessDomChildren = [oldDom];
	// }

	if ((tmp = options._diff)) tmp(newVNode);

	try {
		if (typeof newType == 'function') {
			mountComponent(
				parentDom,
				newVNode,
				globalContext,
				isSvg,
				excessDomChildren,
				commitQueue,
				oldDom,
				isHydrating
			);
			// } else if (
			// 	excessDomChildren == null &&
			// 	newVNode._original === oldVNode._original
			// ) {
			// 	newVNode._children = oldVNode._children;
			// 	newVNode._dom = oldVNode._dom;
		} else {
			newVNode._dom = mountDOMElement(
				null,
				newVNode,
				globalContext,
				isSvg,
				excessDomChildren,
				commitQueue,
				isHydrating
			);
		}

		if ((tmp = options.diffed)) tmp(newVNode);
	} catch (e) {
		newVNode._original = null;
		// if hydrating or creating initial tree, bailout preserves DOM:
		if (isHydrating || excessDomChildren != null) {
			newVNode._dom = oldDom;
			newVNode._hydrating = !!isHydrating;
			excessDomChildren[excessDomChildren.indexOf(oldDom)] = null;
			// ^ could possibly be simplified to:
			// excessDomChildren.length = 0;
		}
		options._catchError(e, newVNode, newVNode);
	}
}

/**
 * Diff two virtual nodes and apply proper changes to the DOM
 * @param {import('../internal').PreactElement} parentDom The parent of the DOM element
 * @param {import('../internal').VNode} newVNode The new virtual node
 * @param {object} globalContext The current context object. Modified by getChildContext
 * @param {boolean} isSvg Whether or not this element is an SVG node
 * @param {Array<import('../internal').PreactElement>} excessDomChildren
 * @param {Array<import('../internal').Component>} commitQueue List of components
 * which have callbacks to invoke in commitRoot
 * @param {import('../internal').PreactElement} oldDom The current attached DOM
 * element any new dom elements should be placed around. Likely `null` on first
 * render (except when hydrating). Can be a sibling DOM element when diffing
 * Fragments that have siblings. In most cases, it starts out as `oldChildren[0]._dom`.
 * @param {boolean} [isHydrating] Whether or not we are in hydration
 */
function mountComponent(
	parentDom,
	newVNode,
	globalContext,
	isSvg,
	excessDomChildren,
	commitQueue,
	oldDom,
	isHydrating
) {
	let tmp, c, clearProcessingException;
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

	// Instantiate the new component
	if ('prototype' in newType && newType.prototype.render) {
		newVNode._component = c = new newType(newProps, componentContext); // eslint-disable-line new-cap
	} else {
		newVNode._component = c = new Component(newProps, componentContext);
		c.constructor = newType;
		c.render = doRender;
	}
	if (provider) provider.sub(c);

	c.props = newProps;
	if (!c.state) c.state = {};
	c.context = componentContext;
	c._globalContext = globalContext;
	c._dirty = true;
	c._renderCallbacks = [];

	// Invoke getDerivedStateFromProps
	if (c._nextState == null) {
		c._nextState = c.state;
	}
	if (newType.getDerivedStateFromProps != null) {
		if (c._nextState == c.state) {
			c._nextState = assign({}, c._nextState);
		}

		assign(
			c._nextState,
			newType.getDerivedStateFromProps(newProps, c._nextState)
		);
	}

	if (
		newType.getDerivedStateFromProps == null &&
		c.componentWillMount != null
	) {
		c.componentWillMount();
	}

	if (c.componentDidMount != null) {
		c._renderCallbacks.push(c.componentDidMount);
	}

	c.context = componentContext;
	c.props = newProps;
	c.state = c._nextState;

	if ((tmp = options._render)) tmp(newVNode);

	c._dirty = false;
	c._vnode = newVNode;
	c._parentDom = parentDom;

	tmp = c.render(c.props, c.state, c.context);

	// Handle setState called in render, see #2553
	c.state = c._nextState;

	if (c.getChildContext != null) {
		globalContext = assign(assign({}, globalContext), c.getChildContext());
	}

	let isTopLevelFragment =
		tmp != null && tmp.type === Fragment && tmp.key == null;
	let renderResult = isTopLevelFragment ? tmp.props.children : tmp;

	mountChildren(
		parentDom,
		Array.isArray(renderResult) ? renderResult : [renderResult],
		newVNode,
		globalContext,
		isSvg,
		excessDomChildren,
		commitQueue,
		oldDom,
		isHydrating
	);

	c.base = newVNode._dom;

	// We successfully rendered this VNode, unset any stored hydration/bailout state:
	newVNode._hydrating = null;

	if (c._renderCallbacks.length) {
		commitQueue.push(c);
	}

	if (clearProcessingException) {
		c._pendingError = c._processingException = null;
	}

	c._force = false;
}

/** The `.render()` method for a PFC backing instance. */
export function doRender(props, state, context) {
	return this.constructor(props, context);
}

/**
 * Diff two virtual nodes representing DOM element
 * @param {import('../internal').PreactElement} dom The DOM element representing
 * the virtual nodes being diffed
 * @param {import('../internal').VNode} newVNode The new virtual node
 * @param {object} globalContext The current context object
 * @param {boolean} isSvg Whether or not this DOM node is an SVG node
 * @param {*} excessDomChildren
 * @param {Array<import('../internal').Component>} commitQueue List of components
 * which have callbacks to invoke in commitRoot
 * @param {boolean} isHydrating Whether or not we are in hydration
 * @returns {import('../internal').PreactElement}
 */
function mountDOMElement(
	dom,
	newVNode,
	globalContext,
	isSvg,
	excessDomChildren,
	commitQueue,
	isHydrating
) {
	let i;
	let newProps = newVNode.props;

	// Tracks entering and exiting SVG namespace when descending through the tree.
	isSvg = newVNode.type === 'svg' || isSvg;

	if (excessDomChildren != null) {
		for (i = 0; i < excessDomChildren.length; i++) {
			const child = excessDomChildren[i];

			// if newVNode matches an element in excessDomChildren or the `dom`
			// argument matches an element in excessDomChildren, remove it from
			// excessDomChildren so it isn't later removed in diffChildren
			if (
				child != null &&
				((newVNode.type === null
					? child.nodeType === 3
					: child.localName === newVNode.type) ||
					dom == child)
			) {
				dom = child;
				excessDomChildren[i] = null;
				break;
			}
		}
	}

	if (dom == null) {
		if (newVNode.type === null) {
			// @ts-ignore createTextNode returns Text, we expect PreactElement
			return document.createTextNode(newProps);
		}

		if (isSvg) {
			dom = document.createElementNS(
				'http://www.w3.org/2000/svg',
				// @ts-ignore We know `newVNode.type` is a string
				newVNode.type
			);
		} else {
			dom = document.createElement(
				// @ts-ignore We know `newVNode.type` is a string
				newVNode.type,
				newProps.is && { is: newProps.is }
			);
		}

		// we created a new parent, so none of the previously attached children can be reused:
		excessDomChildren = null;
		// we are creating a new node, so we can assume this is a new subtree (in case we are hydrating), this deopts the hydrate
		isHydrating = false;
	}

	if (newVNode.type === null) {
		// During hydration, we still have to split merged text from SSR'd HTML.
		if (!isHydrating || dom.data !== newProps) {
			dom.data = newProps;
		}
	} else {
		if (excessDomChildren != null) {
			excessDomChildren = EMPTY_ARR.slice.call(dom.childNodes);
		}

		// @TODO: Consider removing and instructing users to instead set the desired
		// prop for removal to undefined/null. During hydration, props are not
		// diffed at all (including dangerouslySetInnerHTML)
		if (!isHydrating && excessDomChildren != null) {
			// But, if we are in a situation where we are using existing DOM (e.g. replaceNode)
			// we should read the existing DOM attributes to diff them
			for (let i = 0; i < dom.attributes.length; i++) {
				const name = dom.attributes[i].name;
				if (!(name in newProps)) {
					dom.removeAttribute(name);
				}
			}
		}

		let newHtml, newValue, newChecked;
		for (i in newProps) {
			if (i === 'key' || i === 'children') {
			} else if (i === 'dangerouslySetInnerHTML') {
				newHtml = newProps[i];
			} else if (i === 'value') {
				newValue = newProps[i];
			} else if (i === 'checked') {
				newChecked = newProps[i];
			} else if (
				(!isHydrating || typeof newProps[i] == 'function') &&
				newProps[i] != null
			) {
				setProperty(dom, i, newProps[i], null, isSvg);
			}
		}

		// If the new vnode didn't have dangerouslySetInnerHTML, diff its children
		if (newHtml) {
			if (!isHydrating && newHtml.__html) {
				dom.innerHTML = newHtml.__html;
			}
			newVNode._children = [];
		} else {
			i = newVNode.props.children;
			mountChildren(
				dom,
				Array.isArray(i) ? i : [i],
				newVNode,
				globalContext,
				newVNode.type === 'foreignObject' ? false : isSvg,
				excessDomChildren,
				commitQueue,
				excessDomChildren != null ? excessDomChildren[0] : null,
				isHydrating
			);
		}

		// (as above, don't diff props during hydration)
		if (!isHydrating) {
			if (newValue != null) {
				setProperty(dom, 'value', newValue, null, false);
			}
			if (newChecked != null) {
				setProperty(dom, 'checked', newChecked, null, false);
			}
		}
	}

	return dom;
}

/**
 * Diff the children of a virtual node
 * @param {import('../internal').PreactElement} parentDom The DOM element whose
 * children are being diffed
 * @param {import('../internal').ComponentChildren[]} renderResult
 * @param {import('../internal').VNode} newParentVNode The new virtual
 * node whose children should be diff'ed against oldParentVNode
 * @param {object} globalContext The current context object - modified by getChildContext
 * @param {boolean} isSvg Whether or not this DOM node is an SVG node
 * @param {Array<import('../internal').PreactElement>} excessDomChildren
 * @param {Array<import('../internal').Component>} commitQueue List of components
 * which have callbacks to invoke in commitRoot
 * @param {import('../internal').PreactElement} oldDom The current attached DOM
 * element any new dom elements should be placed around. Likely `null` on first
 * render (except when hydrating). Can be a sibling DOM element when diffing
 * Fragments that have siblings. In most cases, it starts out as `oldChildren[0]._dom`.
 * @param {boolean} isHydrating Whether or not we are in hydration
 */
function mountChildren(
	parentDom,
	renderResult,
	newParentVNode,
	globalContext,
	isSvg,
	excessDomChildren,
	commitQueue,
	oldDom,
	isHydrating
) {
	let i, j, childVNode, newDom, firstChildDom, refs;

	newParentVNode._children = [];
	for (i = 0; i < renderResult.length; i++) {
		childVNode = newParentVNode._children[i] = normalizeToVNode(
			renderResult[i]
		);

		// Terser removes the `continue` here and wraps the loop body
		// in a `if (childVNode) { ... } condition
		if (childVNode == null) {
			continue;
		}

		childVNode._parent = newParentVNode;
		childVNode._depth = newParentVNode._depth + 1;

		// Morph the old element into the new one, but don't append it to the dom yet
		mount(
			parentDom,
			childVNode,
			globalContext,
			isSvg,
			excessDomChildren,
			commitQueue,
			oldDom,
			isHydrating
		);

		newDom = childVNode._dom;

		if ((j = childVNode.ref)) {
			if (!refs) refs = [];
			refs.push(j, childVNode._component || newDom, childVNode);
		}

		if (newDom != null) {
			if (firstChildDom == null) {
				firstChildDom = newDom;
			}

			oldDom = mountChild(parentDom, childVNode, newDom, oldDom);

			if (typeof newParentVNode.type == 'function') {
				// Because the newParentVNode is Fragment-like, we need to set it's
				// _nextDom property to the nextSibling of its last child DOM node.
				//
				// `oldDom` contains the correct value here because if the last child
				// is a Fragment-like, then oldDom has already been set to that child's _nextDom.
				// If the last child is a DOM VNode, then oldDom will be set to that DOM
				// node's nextSibling.
				newParentVNode._nextDom = oldDom;
			}
		}
	}

	newParentVNode._dom = firstChildDom;

	// Remove children that are not part of any vnode.
	if (excessDomChildren != null && typeof newParentVNode.type != 'function') {
		for (i = excessDomChildren.length; i--; ) {
			if (excessDomChildren[i] != null) removeNode(excessDomChildren[i]);
		}
	}

	// Set refs only after unmount
	if (refs) {
		for (i = 0; i < refs.length; i++) {
			// @ts-ignore Nested flatten tuples are hard to do in TypeScript
			applyRef(refs[i], refs[++i], refs[++i]);
		}
	}
}

function mountChild(parentDom, childVNode, newDom, oldDom) {
	if (childVNode._nextDom !== undefined) {
		// Only Fragments or components that return Fragment like VNodes will
		// have a non-undefined _nextDom. Continue the diff from the sibling
		// of last DOM child of this child VNode
		let nextDom = childVNode._nextDom;

		// Eagerly cleanup _nextDom. We don't need to persist the value because
		// it is only used by `diffChildren` to determine where to resume the diff after
		// diffing Components and Fragments. Once we store it the nextDOM local var, we
		// can clean up the property
		childVNode._nextDom = undefined;

		return nextDom;
	} else if (newDom == oldDom) {
		// If newDom and oldDom are the same when mounting (i.e hydrating), then the
		// node is already in-place. Do nothing and return the next DOM node that
		// should be hydrated.
		return newDom.nextSibling;
	}

	// Hydration and non hydration
	// Possible follow up related text node normalization.
	// Insert before with a non-null oldDom is called during mounting in these
	// cases:
	// 1. mounting new vnodes during a diff
	// 2. mounting mismatched trees during hydration
	// 3. splitting text nodes during hydration (we don't normalize text
	//    nodes)
	parentDom.insertBefore(newDom, oldDom);
	return oldDom || null;
}
