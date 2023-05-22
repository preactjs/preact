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
import { createInternal, getParentContext } from '../tree';
import options from '../options';
import { ENABLE_CLASSES } from '../component';
import { commitQueue } from './commit';
/**
 * Diff two virtual nodes and apply proper changes to the DOM
 * @param {import('../internal').Internal} internal The Internal node to mount
 * @param {import('../internal').VNode | string} newVNode The new virtual node
 * @param {import('../internal').PreactElement} parentDom The element into which this subtree is rendered
 * @param {import('../internal').PreactNode} startDom
 * @returns {import('../internal').PreactNode | null} pointer to the next DOM node to be hydrated (or null)
 */
export function mount(internal, newVNode, parentDom, startDom, refs) {
	if (options._diff) options._diff(internal, newVNode);

	/** @type {import('../internal').PreactNode} */
	let nextDomSibling, prevStartDom;

	try {
		if (internal.flags & TYPE_COMPONENT) {
			// Root nodes signal that an attempt to render into a specific DOM node on
			// the page. Root nodes can occur anywhere in the tree and not just at the
			// top.
			if (
				internal.flags & TYPE_ROOT &&
				newVNode.props._parentDom !== parentDom
			) {
				parentDom = newVNode.props._parentDom;
				prevStartDom = startDom;
				startDom = null;
			}

			const renderResult = mountComponent(internal, startDom);
			if (renderResult === startDom) {
				nextDomSibling = startDom;
			} else {
				nextDomSibling = mountChildren(
					internal,
					renderResult,
					parentDom,
					startDom,
					refs
				);
			}

			if (
				internal.data._commitCallbacks &&
				internal.data._commitCallbacks.length
			) {
				commitQueue.push(internal);
			}
		} else {
			// @TODO: we could just assign this as internal.dom here
			let hydrateDom =
				internal.flags & (MODE_HYDRATE | MODE_MUTATIVE_HYDRATE)
					? startDom
					: null;

			nextDomSibling = mountElement(internal, hydrateDom, refs);
		}

		if (options.diffed) options.diffed(internal);

		// We successfully rendered this VNode, unset any stored hydration/bailout state:
		internal.flags &= RESET_MODE;
	} catch (e) {
		internal._vnodeId = 0;
		internal.flags |= e.then ? MODE_SUSPENDED : MODE_ERRORED;

		if (internal.flags & MODE_HYDRATE) {
			// @ts-ignore Trust me TS, nextSibling is a PreactElement
			nextDomSibling = startDom && startDom.nextSibling;
			internal.data = startDom; // Save our current DOM position to resume later
		}
		options._catchError(e, internal);
	}

	return prevStartDom || nextDomSibling;
}

/**
 * Construct (or select, if hydrating) a new DOM element for the given Internal.
 * @param {import('../internal').Internal} internal
 * @param {import('../internal').PreactNode} dom A DOM node to attempt to re-use during hydration
 * @returns {import('../internal').PreactNode}
 */
function mountElement(internal, dom, refs) {
	let newProps = internal.props;
	let nodeType = internal.type;
	let flags = internal.flags;

	// Are we rendering within an inline SVG?
	let isSvg = flags & MODE_SVG;

	// Are we *not* hydrating? (a top-level render() or mutative hydration):
	let isFullRender = ~flags & MODE_HYDRATE;

	/** @type {any} */
	let i, value;

	// if hydrating (hydrate() or render() with replaceNode), find the matching child:
	if (flags & (MODE_HYDRATE | MODE_MUTATIVE_HYDRATE)) {
		while (
			dom &&
			(nodeType ? dom.localName !== nodeType : dom.nodeType !== 3)
		) {
			dom = dom.nextSibling;
		}
	}

	let isNew = dom == null;

	if (flags & TYPE_TEXT) {
		if (isNew) {
			// @ts-ignore createTextNode returns Text, we expect PreactElement
			dom = new Text(newProps);
		} else if (dom.data !== newProps) {
			dom.data = newProps;
		}

		internal.data = dom;
	} else {
		// Tracks entering and exiting SVG namespace when descending through the tree.
		// if (nodeType === 'svg') internal.flags |= MODE_SVG;

		if (isNew) {
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

		// @TODO: Consider removing and instructing users to instead set the desired
		// prop for removal to undefined/null. During hydration, props are not
		// diffed at all (including dangerouslySetInnerHTML)
		if (flags & MODE_MUTATIVE_HYDRATE) {
			// But, if we are in a situation where we are using existing DOM (e.g. replaceNode)
			// we should read the existing DOM attributes to diff them
			for (i = 0; i < dom.attributes.length; i++) {
				value = dom.attributes[i].name;
				if (!(value in newProps)) {
					dom.removeAttribute(value);
				}
			}
		}

		let newHtml, newValue, newChildren;
		for (i in newProps) {
			value = newProps[i];
			if (i === 'children') {
				newChildren = value;
			} else if (i === 'dangerouslySetInnerHTML') {
				newHtml = value;
			} else if (i === 'value') {
				newValue = value;
			} else if (
				value != null &&
				(isFullRender || typeof value == 'function')
			) {
				setProperty(dom, i, value, null, isSvg);
			}
		}

		internal.data = dom;

		// If the new vnode didn't have dangerouslySetInnerHTML, diff its children
		if (newHtml) {
			if (isFullRender && newHtml.__html) {
				dom.innerHTML = newHtml.__html;
			}
		} else if (newChildren != null) {
			mountChildren(
				internal,
				Array.isArray(newChildren) ? newChildren : [newChildren],
				dom,
				isNew ? null : dom.firstChild,
				refs
			);
		}

		// (as above, don't diff props during hydration)
		if (isFullRender && newValue != null) {
			setProperty(dom, 'value', newValue, null, 0);
		}
	}

	// @ts-ignore
	return isNew ? null : dom.nextSibling;
}

/**
 * Mount all children of an Internal
 * @param {import('../internal').Internal} internal The parent Internal of the given children
 * @param {import('../internal').ComponentChild[]} children
 * @param {import('../internal').PreactElement} parentDom The element into which this subtree is rendered
 * @param {import('../internal').PreactNode} startDom
 */
export function mountChildren(internal, children, parentDom, startDom, refs) {
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
		mountedNextChild = mount(childInternal, childVNode, parentDom, startDom);

		newDom = childInternal.data;

		if (childInternal.flags & TYPE_COMPONENT || newDom == startDom) {
			// If the child is a Fragment-like or if it is DOM VNode and its _dom
			// property matches the dom we are diffing (i.e. startDom), just
			// continue with the mountedNextChild
			startDom = mountedNextChild;
		} else if (newDom != null) {
			// The DOM the diff should begin with is now startDom (since we inserted
			// newDom before startDom) so ignore mountedNextChild and continue with
			// startDom
			parentDom.insertBefore(newDom, startDom);
		}

		if (childInternal.ref) {
			if (refs) {
				refs.push(childInternal, undefined);
				childInternal.ref = childVNode.ref;
			} else {
				applyRef(
					childInternal.ref,
					childInternal._component || newDom,
					childInternal
				);
			}
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

/**
 * @param {import('../internal').Internal} internal The component's backing Internal node
 * @param {import('../internal').PreactNode} startDom the preceding node
 * @returns {import('../internal').PreactNode} the component's children
 */
function mountComponent(internal, startDom) {
	/** @type {import('../internal').Component} */
	let c;
	let type = /** @type {import('../internal').ComponentType} */ (internal.type);
	let newProps = internal.props;

	// Necessary for createContext api. Setting this property will pass
	// the context value as `this.context` just for this component.
	let context = getParentContext(internal);
	let tmp = type.contextType;
	let provider = tmp && context[tmp._id];
	let componentContext = tmp
		? provider
			? provider.props.value
			: tmp._defaultValue
		: context;

	if (provider) provider._subs.add(internal);

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

	if (ENABLE_CLASSES) {
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
			internal.data._commitCallbacks.push(c.componentDidMount.bind(c));
		}
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
		if (ENABLE_CLASSES && internal.flags & TYPE_CLASS) {
			renderResult = c.render(c.props, c.state, c.context);
			for (let i = 0; i < internal.data._stateCallbacks.length; i++) {
				internal.data._commitCallbacks.push(internal.data._stateCallbacks[i]);
			}
			internal.data._stateCallbacks = [];
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
		internal.data._context = Object.assign({}, context, c.getChildContext());
	}

	if (renderResult == null) {
		return startDom;
	}

	if (typeof renderResult == 'object') {
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

	return renderResult;
}
