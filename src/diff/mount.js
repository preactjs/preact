import { applyRef } from './refs';
import {
	TYPE_COMPONENT,
	TYPE_ELEMENT,
	MODE_HYDRATE,
	MODE_MUTATIVE_HYDRATE,
	MODE_SUSPENDED,
	RESET_MODE,
	TYPE_TEXT,
	TYPE_CLASS,
	MODE_ERRORED,
	TYPE_ROOT,
	MODE_SVG,
	DIRTY_BIT
} from '../constants';
import { normalizeToVNode, Fragment } from '../create-element';
import { setProperty } from './props';
import { createInternal } from '../tree';
import options from '../options';
import { rendererState } from './commit';
/**
 * Diff two virtual nodes and apply proper changes to the DOM
 * @param {import('../internal').Internal} internal The Internal node to mount
 * @param {import('../internal').VNode | string} newVNode The new virtual node
 * @param {import('../internal').PreactNode} startDom
 * @returns {import('../internal').PreactNode | null} pointer to the next DOM node to be hydrated (or null)
 */
export function mount(internal, newVNode, startDom) {
	if (options._diff) options._diff(internal, newVNode);

	/** @type {import('../internal').PreactNode} */
	let nextDomSibling,
		prevStartDom,
		flags = internal.flags;

	// @TODO: could just assign this as internal.dom here?
	let hydrateDom =
		flags & (MODE_HYDRATE | MODE_MUTATIVE_HYDRATE) ? startDom : null;

	// Root nodes signal that an attempt to render into a specific DOM node on
	// the page. Root nodes can occur anywhere in the tree and not just at the
	// top.
	let prevParentDom = rendererState._parentDom;
	if (flags & TYPE_ROOT) {
		rendererState._parentDom = newVNode.props._parentDom;

		// Note: this is likely always true because we are inside mount()
		if (rendererState._parentDom !== prevParentDom) {
			startDom = null;
		}
	}

	if (flags & TYPE_TEXT) {
		// if hydrating (hydrate() or render() with replaceNode), find the matching child:
		while (hydrateDom) {
			nextDomSibling = hydrateDom.nextSibling;
			if (hydrateDom.nodeType === 3) {
				// if hydrating a Text node, ensure its text content is correct:
				if (hydrateDom.data != internal.props) {
					hydrateDom.data = internal.props;
				}
				break;
			}
			hydrateDom = nextDomSibling;
		}

		// @ts-ignore createTextNode returns Text, we expect PreactElement
		internal._dom = hydrateDom || document.createTextNode(internal.props);
		internal.flags &= RESET_MODE;
	} else if (flags & TYPE_ELEMENT) {
		nextDomSibling = mountElement(internal, hydrateDom);
		internal.flags &= RESET_MODE;
	} else {
		try {
			let prevContext = rendererState._context;
			// Necessary for createContext api. Setting this property will pass
			// the context value as `this.context` just for this component.
			let tmp = newVNode.type.contextType;
			let provider = tmp && rendererState._context[tmp._id];
			let componentContext = tmp
				? provider
					? provider.props.value
					: tmp._defaultValue
				: rendererState._context;

			if (provider) provider._subs.add(internal);

			let renderResult = mountComponent(internal, componentContext);

			if (renderResult == null) {
				nextDomSibling = startDom;
			} else {
				if (typeof renderResult === 'object') {
					// dissolve unkeyed root fragments:
					if (renderResult.type === Fragment && renderResult.key == null) {
						renderResult = renderResult.props.children;
					}
					if (!Array.isArray(renderResult)) {
						renderResult = [renderResult];
					}
				} else {
					renderResult = [renderResult];
				}

				nextDomSibling = mountChildren(internal, renderResult, startDom);
			}

			if (
				internal._commitCallbacks != null &&
				internal._commitCallbacks.length
			) {
				rendererState._commitQueue.push(internal);
			}

			rendererState._parentDom = prevParentDom;
			// In the event this subtree creates a new context for its children, restore
			// the previous context for its siblings
			rendererState._context = prevContext;
			// We successfully rendered this VNode, unset any stored hydration/bailout state:
			internal.flags &= RESET_MODE;
		} catch (e) {
			internal._vnodeId = 0;
			internal.flags |= e.then ? MODE_SUSPENDED : MODE_ERRORED;

			if (flags & MODE_HYDRATE) {
				// @ts-ignore Trust me TS, nextSibling is a PreactElement
				nextDomSibling = startDom && startDom.nextSibling;
				internal._dom = startDom; // Save our current DOM position to resume later
			}
			options._catchError(e, internal);
		}
	}

	if (flags & TYPE_ROOT && prevParentDom !== rendererState._parentDom) {
		// If we just mounted a root node/Portal, and it changed the parentDom
		// of it's children, then we need to resume the diff from it's previous
		// startDom element, which could be null if we are mounting an entirely
		// new tree, or the portal's nextSibling if we are mounting a Portal in
		// an existing tree.
		nextDomSibling = prevStartDom;
	}

	if (options.diffed) options.diffed(internal);

	return prevStartDom || nextDomSibling;
}

/**
 * Render a function component
 * @param {import('../internal').Internal} internal The component's backing Internal node
 * @param {any} componentContext The aggregated context
 * @returns {import('../internal').ComponentChildren} the component's children
 */
function mountComponent(internal, componentContext) {
	/** @type {import('../internal').Component} */
	let c;

	let type = /** @type {import('../internal').ComponentType} */ (internal.type);
	let newProps = internal.props;

	if (internal.flags & TYPE_CLASS) {
		// @ts-ignore `type` is a class component constructor
		c = new type(newProps, componentContext);
	} else {
		c = {
			props: newProps,
			context: componentContext,
			forceUpdate: internal.rerender.bind(null, internal)
		};
	}

	c._internal = internal;
	internal._component = c;
	internal.flags |= DIRTY_BIT;

	if (!c.state) c.state = {};
	if (c._nextState == null) c._nextState = c.state;

	if (type.getDerivedStateFromProps != null) {
		if (c._nextState == c.state) {
			c._nextState = Object.assign({}, c._nextState);
		}

		Object.assign(
			c._nextState,
			type.getDerivedStateFromProps(newProps, c._nextState)
		);
	}

	if (type.getDerivedStateFromProps == null && c.componentWillMount != null) {
		c.componentWillMount();
	}

	if (c.componentDidMount != null) {
		// If the component was constructed, queue up componentDidMount so the
		// first time this internal commits (regardless of suspense or not) it
		// will be called
		internal._commitCallbacks.push(c.componentDidMount.bind(c));
	}

	c.context = componentContext;
	internal.props = c.props = newProps;
	c.state = c._nextState;

	let renderHook = options._render;
	if (renderHook) renderHook(internal);

	let counter = 0,
		renderResult;
	while (counter++ < 25) {
		internal.flags &= ~DIRTY_BIT;
		if (renderHook) renderHook(internal);
		if (internal.flags & TYPE_CLASS) {
			renderResult = c.render(c.props, c.state, c.context);
			// note: disable repeat render invocation for class components
			break;
		} else {
			renderResult = type.call(c, c.props, c.context);
		}
		if (!(internal.flags & DIRTY_BIT)) {
			break;
		}
	}

	// Handle setState called in render, see #2553
	c.state = c._nextState;

	if (c.getChildContext != null) {
		rendererState._context = internal._context = Object.assign(
			{},
			rendererState._context,
			c.getChildContext()
		);
	}

	return renderResult;
}

/**
 * Construct (or select, if hydrating) a new DOM element for the given Internal.
 * @param {import('../internal').Internal} internal
 * @param {import('../internal').PreactNode} dom A DOM node to attempt to re-use during hydration
 * @returns {import('../internal').PreactNode}
 */
function mountElement(internal, dom) {
	let newProps = internal.props,
		nodeType = internal.type,
		flags = internal.flags,
		hydrateChild = null,
		nextDomSibling;
	// Are we rendering within an inline SVG?
	let isSvg = flags & MODE_SVG;
	// Are we *not* hydrating? (a top-level render() or mutative hydration):
	let isFullRender = ~flags & MODE_HYDRATE;

	// if hydrating (hydrate() or render() with replaceNode), find the matching child:
	if (flags & (MODE_HYDRATE | MODE_MUTATIVE_HYDRATE)) {
		while (dom) {
			if (dom.localName === nodeType) {
				hydrateChild = dom.firstChild;
				nextDomSibling = dom.nextSibling;

				if (flags & MODE_MUTATIVE_HYDRATE) {
					// "Mutative Hydration":
					// When hydrating an existing DOM tree within a full render, we diff attributes.
					// This happens when a `replaceNode` value is passed to render().
					//
					// @TODO: Consider removing and recommending setting changed props after initial hydration.
					// During normal hydration, no props are diffed - only event handlers are applied.
					for (let i = 0; i < dom.attributes.length; i++) {
						let value = dom.attributes[i].name;
						if (!(value in newProps)) {
							dom.removeAttribute(value);
						}
					}
				}
				break;
			}
			dom = dom.nextElementSibling;
		}
	}

	if (dom == null) {
		if (isSvg) {
			dom = document.createElementNS(
				'http://www.w3.org/2000/svg',
				// @ts-ignore We know `newVNode.type` is a string
				nodeType
			);
		} else {
			dom = document.createElement(
				// @ts-ignore We know `newVNode.type` is a string
				nodeType,
				newProps.is && newProps
			);
		}

		// we are creating a new node, so we can assume this is a new subtree (in case we are hydrating), this deopts the hydrate
		internal.flags = flags &= RESET_MODE;
		isFullRender = 1;
	}

	// Apply props
	let newHtml, newValue, newChildren;
	for (let i in newProps) {
		let value = newProps[i];
		if (i === 'children') {
			newChildren = value;
		} else if (i === 'dangerouslySetInnerHTML') {
			newHtml = value;
		} else if (i === 'value') {
			newValue = value;
		} else if (value != null && (isFullRender || typeof value === 'function')) {
			setProperty(dom, i, value, null, isSvg);
		}
	}

	if (
		(nodeType === 'input' ||
			nodeType === 'textarea' ||
			nodeType === 'select') &&
		(newProps.onInput || newProps.onChange)
	) {
		if (newProps.value != null) {
			dom._isControlled = true;
			dom._prevValue = newProps.value;
		} else if (newProps.checked != null) {
			dom._isControlled = true;
			dom._prevValue = newProps.checked;
		}
	}

	internal._dom = dom;

	// If the new vnode didn't have dangerouslySetInnerHTML, diff its children
	if (newHtml) {
		if (isFullRender && newHtml.__html) {
			dom.innerHTML = newHtml.__html;
		}
	} else if (newChildren != null) {
		const prevParentDom = rendererState._parentDom;
		rendererState._parentDom = dom;
		mountChildren(
			internal,
			Array.isArray(newChildren) ? newChildren : [newChildren],
			hydrateChild
		);
		rendererState._parentDom = prevParentDom;
	}

	// (as above, don't diff props during hydration)
	if (isFullRender && newValue != null) {
		setProperty(dom, 'value', newValue, null, 0);
	}

	return nextDomSibling;
}

/**
 * Mount all children of an Internal
 * @param {import('../internal').Internal} internal The parent Internal of the given children
 * @param {import('../internal').ComponentChild[]} children
 * @param {import('../internal').PreactNode} startDom
 */
export function mountChildren(internal, children, startDom) {
	let internalChildren = (internal._children = []),
		i,
		childVNode,
		childInternal,
		newDom,
		mountedNextChild;

	for (i = 0; i < children.length; i++) {
		childVNode = normalizeToVNode(children[i]);

		// Terser removes the `continue` here and wraps the loop body
		// in a `if (childVNode) { ... } condition
		if (childVNode == null) {
			internalChildren[i] = null;
			continue;
		}

		childInternal = createInternal(childVNode, internal);
		internalChildren[i] = childInternal;

		// Morph the old element into the new one, but don't append it to the dom yet
		mountedNextChild = mount(childInternal, childVNode, startDom);

		newDom = childInternal._dom;

		if (childInternal.flags & TYPE_COMPONENT || newDom == startDom) {
			// If the child is a Fragment-like or if it is DOM VNode and its _dom
			// property matches the dom we are diffing (i.e. startDom), just
			// continue with the mountedNextChild
			startDom = mountedNextChild;
		} else if (newDom != null) {
			// The DOM the diff should begin with is now startDom (since we inserted
			// newDom before startDom) so ignore mountedNextChild and continue with
			// startDom
			rendererState._parentDom.insertBefore(newDom, startDom);
		}

		if (childInternal.ref) {
			applyRef(
				childInternal.ref,
				childInternal._component || newDom,
				childInternal
			);
		}
	}

	// Remove children that are not part of any vnode.
	if (
		internal.flags & (MODE_HYDRATE | MODE_MUTATIVE_HYDRATE) &&
		internal.flags & TYPE_ELEMENT
	) {
		// TODO: Would it be simpler to just clear the pre-existing DOM in top-level
		// render if render is called with no oldVNode & existing children & no
		// replaceNode? Instead of patching the DOM to match the VNode tree? (remove
		// attributes & unused DOM)
		while (startDom) {
			i = startDom;
			startDom = startDom.nextSibling;
			i.remove();
		}
	}

	return startDom;
}
