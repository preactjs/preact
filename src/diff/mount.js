import {
	EMPTY_OBJ,
	MODE_HYDRATE,
	MODE_SUSPENDED,
	RESET_MODE,
	UNDEFINED
} from '../constants';
import { BaseComponent } from '../component';
import { Fragment } from '../create-element';
import { diffChildren } from './children';
import { setProperty } from './props';
import { assign, isArray, slice } from '../util';
import options from '../options';

/**
 * Diff two virtual nodes and apply proper changes to the DOM
 * @param {PreactElement} parentDom The parent of the DOM element
 * @param {VNode} newVNode The new virtual node
 * @param {object} globalContext The current context object. Modified by
 * getChildContext
 * @param {string} namespace Current namespace of the DOM node (HTML, SVG, or MathML)
 * @param {Array<PreactElement>} excessDomChildren
 * @param {Array<Component>} commitQueue List of components which have callbacks
 * to invoke in commitRoot
 * @param {PreactElement} oldDom The current attached DOM element any new dom
 * elements should be placed around. Likely `null` on first render (except when
 * hydrating). Can be a sibling DOM element when diffing Fragments that have
 * siblings. In most cases, it starts out as `oldChildren[0]._dom`.
 * @param {boolean} isHydrating Whether or not we are in hydration
 * @param {any[]} refQueue an array of elements needed to invoke refs
 */
export function mount(
	parentDom,
	newVNode,
	globalContext,
	namespace,
	excessDomChildren,
	commitQueue,
	oldDom,
	isHydrating,
	refQueue
) {
	// When passing through createElement it assigns the object
	// constructor as undefined. This to prevent JSON-injection.
	if (newVNode.constructor !== UNDEFINED) return null;

	/** @type {any} */
	let tmp,
		newType = newVNode.type;

	if ((tmp = options._diff)) tmp(newVNode);

	if (typeof newType == 'function') {
		try {
			let c,
				newProps = newVNode.props;
			const isClassComponent =
				'prototype' in newType && newType.prototype.render;

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
			if (isClassComponent) {
				// @ts-expect-error The check above verifies that newType is suppose to be constructed
				newVNode._component = c = new newType(newProps, componentContext); // eslint-disable-line new-cap
			} else {
				// @ts-expect-error Trust me, Component implements the interface we want
				newVNode._component = c = new BaseComponent(newProps, componentContext);
				c.constructor = newType;
				c.render = doRender;
			}

			if (provider) provider.sub(c);

			if (!c.state) c.state = {};

			c.props = newProps;
			c.context = componentContext;
			c._globalContext = globalContext;
			c._force = c._dirty = false;
			c._renderCallbacks = [];
			c._stateCallbacks = [];
			c._vnode = newVNode;
			c._parentDom = parentDom;

			if (isClassComponent && c._nextState == null) {
				c._nextState = c.state;
			}

			if (isClassComponent && newType.getDerivedStateFromProps != null) {
				if (c._nextState == c.state) {
					c._nextState = assign({}, c._nextState);
				}

				assign(
					c._nextState,
					newType.getDerivedStateFromProps(newProps, c._nextState)
				);
			}

			// Invoke pre-render lifecycle methods
			if (
				isClassComponent &&
				newType.getDerivedStateFromProps == null &&
				c.componentWillMount != null
			) {
				c.componentWillMount();
			}

			if (isClassComponent && c.componentDidMount != null) {
				c._renderCallbacks.push(c.componentDidMount);
			}

			let renderHook = options._render,
				count = 0;
			if (isClassComponent) {
				c.state = c._nextState;

				if (renderHook) renderHook(newVNode);

				tmp = c.render(c.props, c.state, c.context);

				for (let i = 0; i < c._stateCallbacks.length; i++) {
					c._renderCallbacks.push(c._stateCallbacks[i]);
				}
				c._stateCallbacks = [];
			} else {
				do {
					c._dirty = false;
					if (renderHook) renderHook(newVNode);

					tmp = c.render(c.props, c.state, c.context);

					// Handle setState called in render, see #2553
					c.state = c._nextState;
				} while (c._dirty && ++count < 25);
			}

			// Handle setState called in render, see #2553
			c.state = c._nextState;

			if (c.getChildContext != null) {
				globalContext = assign({}, globalContext, c.getChildContext());
			}

			let isTopLevelFragment =
				tmp != null && tmp.type === Fragment && tmp.key == null;
			let renderResult = isTopLevelFragment ? tmp.props.children : tmp;

			oldDom = diffChildren(
				parentDom,
				isArray(renderResult) ? renderResult : [renderResult],
				newVNode,
				EMPTY_OBJ,
				globalContext,
				namespace,
				excessDomChildren,
				commitQueue,
				oldDom,
				isHydrating,
				refQueue
			);

			// We successfully rendered this VNode, unset any stored hydration/bailout state:
			newVNode._flags &= RESET_MODE;

			if (c._renderCallbacks.length) {
				commitQueue.push(c);
			}
		} catch (e) {
			newVNode._original = null;
			// if hydrating or creating initial tree, bailout preserves DOM:
			if (isHydrating || excessDomChildren != null) {
				if (e.then) {
					newVNode._flags |= isHydrating
						? MODE_HYDRATE | MODE_SUSPENDED
						: MODE_SUSPENDED;

					while (oldDom && oldDom.nodeType === 8 && oldDom.nextSibling) {
						oldDom = oldDom.nextSibling;
					}

					excessDomChildren[excessDomChildren.indexOf(oldDom)] = null;
					newVNode._dom = oldDom;
				} else {
					for (let i = excessDomChildren.length; i--; ) {
						if (excessDomChildren[i]) excessDomChildren[i].remove();
					}
				}
			}
			options._catchError(e, newVNode, EMPTY_OBJ);
		}
	} else {
		oldDom = newVNode._dom = mountElementNode(
			newVNode,
			globalContext,
			namespace,
			excessDomChildren,
			commitQueue,
			isHydrating,
			refQueue
		);
	}

	if ((tmp = options.diffed)) tmp(newVNode);

	return newVNode._flags & MODE_SUSPENDED ? undefined : oldDom;
}

/**
 * Diff two virtual nodes representing DOM element
 * @param {VNode} newVNode The new virtual node
 * @param {object} globalContext The current context object
 * @param {string} namespace Current namespace of the DOM node (HTML, SVG, or MathML)
 * @param {Array<PreactElement>} excessDomChildren
 * @param {Array<Component>} commitQueue List of components which have callbacks
 * to invoke in commitRoot
 * @param {boolean} isHydrating Whether or not we are in hydration
 * @param {any[]} refQueue an array of elements needed to invoke refs
 * @returns {PreactElement}
 */
function mountElementNode(
	newVNode,
	globalContext,
	namespace,
	excessDomChildren,
	commitQueue,
	isHydrating,
	refQueue
) {
	/** @type {PreactElement} */
	let dom;
	let oldProps = EMPTY_OBJ;
	let newProps = newVNode.props;
	let nodeType = /** @type {string} */ (newVNode.type);
	/** @type {any} */
	let i;
	/** @type {{ __html?: string }} */
	let newHtml;
	/** @type {ComponentChildren} */
	let newChildren;
	let value;
	let inputValue;
	let checked;

	// Tracks entering and exiting namespaces when descending through the tree.
	if (nodeType === 'svg') namespace = 'http://www.w3.org/2000/svg';
	else if (nodeType === 'math')
		namespace = 'http://www.w3.org/1998/Math/MathML';
	else if (!namespace) namespace = 'http://www.w3.org/1999/xhtml';

	if (excessDomChildren != null) {
		for (i = 0; i < excessDomChildren.length; i++) {
			value = excessDomChildren[i];

			// if newVNode matches an element in excessDomChildren or the `dom`
			// argument matches an element in excessDomChildren, remove it from
			// excessDomChildren so it isn't later removed in diffChildren
			if (
				value &&
				'setAttribute' in value === !!nodeType &&
				(nodeType ? value.localName === nodeType : value.nodeType === 3)
			) {
				dom = value;
				excessDomChildren[i] = null;
				break;
			}
		}
	}

	if (dom == null) {
		if (nodeType === null) {
			return document.createTextNode(newProps);
		}

		dom = document.createElementNS(
			namespace,
			nodeType,
			newProps.is && newProps
		);

		// we are creating a new node, so we can assume this is a new subtree (in
		// case we are hydrating), this deopts the hydrate
		if (isHydrating) {
			if (options._hydrationMismatch)
				options._hydrationMismatch(newVNode, excessDomChildren);
			isHydrating = false;
		}
		// we created a new parent, so none of the previously attached children can be reused:
		excessDomChildren = null;
	}

	if (nodeType === null) {
		// During hydration, we still have to split merged text from SSR'd HTML.
		if (!isHydrating || dom.data !== newProps) {
			dom.data = newProps;
		}
	} else {
		// If excessDomChildren was not null, repopulate it with the current element's children:
		excessDomChildren = excessDomChildren && slice.call(dom.childNodes);

		oldProps = EMPTY_OBJ;

		// If we are in a situation where we are not hydrating but are using
		// existing DOM (e.g. replaceNode) we should read the existing DOM
		// attributes to diff them
		if (!isHydrating && excessDomChildren != null) {
			oldProps = {};
			for (i = 0; i < dom.attributes.length; i++) {
				value = dom.attributes[i];
				oldProps[value.name] = value.value;
			}
		}

		for (i in oldProps) {
			value = oldProps[i];
			if (i == 'children') {
			} else if (i == 'dangerouslySetInnerHTML') {
			} else if (!(i in newProps)) {
				if (
					(i == 'value' && 'defaultValue' in newProps) ||
					(i == 'checked' && 'defaultChecked' in newProps)
				) {
					continue;
				}
				setProperty(dom, i, null, value, namespace);
			}
		}

		// During hydration, props are not diffed at all (including dangerouslySetInnerHTML)
		// @TODO we should warn in debug mode when props don't match here.
		for (i in newProps) {
			value = newProps[i];
			if (i == 'children') {
				newChildren = value;
			} else if (i == 'dangerouslySetInnerHTML') {
				newHtml = value;
			} else if (i == 'value') {
				inputValue = value;
			} else if (i == 'checked') {
				checked = value;
			} else if (
				(!isHydrating || typeof value == 'function') &&
				oldProps[i] !== value
			) {
				setProperty(dom, i, value, oldProps[i], namespace);
			}
		}

		// If the new vnode didn't have dangerouslySetInnerHTML, diff its children
		if (newHtml) {
			// Avoid re-applying the same '__html' if it did not changed between re-render
			if (!isHydrating) {
				dom.innerHTML = newHtml.__html;
			}

			newVNode._children = [];
		} else {
			diffChildren(
				dom,
				isArray(newChildren) ? newChildren : [newChildren],
				newVNode,
				EMPTY_OBJ,
				globalContext,
				nodeType === 'foreignObject'
					? 'http://www.w3.org/1999/xhtml'
					: namespace,
				excessDomChildren,
				commitQueue,
				excessDomChildren ? excessDomChildren[0] : null,
				isHydrating,
				refQueue
			);

			// Remove children that are not part of any vnode.
			if (excessDomChildren != null) {
				for (i = excessDomChildren.length; i--; ) {
					if (excessDomChildren[i]) excessDomChildren[i].remove();
				}
			}
		}

		// As above, don't diff props during hydration
		if (!isHydrating) {
			i = 'value';
			if (nodeType === 'progress' && inputValue == null) {
				dom.removeAttribute('value');
			} else if (
				inputValue !== UNDEFINED &&
				// #2756 For the <progress>-element the initial value is 0,
				// despite the attribute not being present. When the attribute
				// is missing the progress bar is treated as indeterminate.
				// To fix that we'll always update it when it is 0 for progress elements
				(inputValue !== dom[i] || (nodeType === 'progress' && !inputValue))
			) {
				setProperty(dom, i, inputValue, oldProps[i], namespace);
			}

			i = 'checked';
			if (checked !== UNDEFINED && checked !== dom[i]) {
				setProperty(dom, i, checked, oldProps[i], namespace);
			}
		}
	}

	return dom;
}

/** The `.render()` method for a PFC backing instance. */
function doRender(props, _state, context) {
	return this.constructor(props, context);
}
