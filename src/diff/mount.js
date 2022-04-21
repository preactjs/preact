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
import options from '../options';
import { normalizeToVNode, Fragment } from '../create-element';
import { setProperty } from './props';
import { createInternal, getParentContext } from '../tree';
import { commitQueue } from './renderer';

/**
 * Diff two virtual nodes and apply proper changes to the DOM
 * @param {import('../internal').Internal} internal The Internal node to mount
 * @param {import('../internal').VNode | string} vnode The new virtual node
 * @param {import('../internal').PreactElement} parentDom The element into which this subtree should be inserted
 * @param {import('../internal').PreactNode} startDom
 * @returns {import('../internal').PreactNode | null} pointer to the next DOM node to be hydrated (or null)
 */
export function mount(internal, vnode, parentDom, startDom) {
	if (options._diff) options._diff(internal, vnode);

	let flags = internal.flags;
	let props = internal.props;

	/** @type {import('../internal').PreactNode} */
	let nextDomSibling;

	// @TODO: could just assign this as internal.dom here?
	let hydrateDom =
		flags & (MODE_HYDRATE | MODE_MUTATIVE_HYDRATE) ? startDom : null;

	// Root nodes signal that an attempt to render into a specific DOM node on
	// the page. Root nodes can occur anywhere in the tree and not just at the
	// top.
	let prevStartDom;
	let prevParentDom = parentDom;
	if (flags & TYPE_ROOT) {
		parentDom = props._parentDom;

		if (parentDom !== prevParentDom) {
			prevStartDom = startDom;
			startDom = null;
		}
	}

	if (flags & TYPE_TEXT) {
		// if hydrating (hydrate() or render() with replaceNode), find the matching child:
		while (hydrateDom) {
			nextDomSibling = hydrateDom.nextSibling;
			if (hydrateDom.nodeType === 3) {
				// if hydrating a Text node, ensure its text content is correct:
				if (hydrateDom.data != props) {
					hydrateDom.data = props;
				}
				break;
			}
			hydrateDom = nextDomSibling;
		}

		// @ts-ignore createTextNode returns Text, we expect PreactElement
		internal._dom = hydrateDom || document.createTextNode(props);
		internal.flags &= RESET_MODE;
	} else if (flags & TYPE_ELEMENT) {
		nextDomSibling = mountElement(internal, hydrateDom);
		internal.flags &= RESET_MODE;
	} else {
		try {
			nextDomSibling = mountComponent(
				internal,
				props,
				parentDom,
				startDom,
				flags
			);

			if (internal._commitCallbacks.length) {
				commitQueue.push(internal);
			}

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

	// internal.flags &= RESET_MODE;

	if (options.diffed) options.diffed(internal);

	// If we just mounted a root node/Portal, and it changed the parentDom
	// of it's children, then we need to resume the diff from it's previous
	// startDom element, which could be null if we are mounting an entirely
	// new tree, or the portal's nextSibling if we are mounting a Portal in
	// an existing tree.
	return prevStartDom || nextDomSibling;
}

/**
 * @param {import('../internal').Internal} internal
 * @param {any} props
 * @param {import('../internal').PreactElement} parentDom
 * @param {import('../internal').PreactNode} startDom
 * @param {import('../internal').Internal['flags']} flags
 */
function mountComponent(internal, props, parentDom, startDom, flags) {
	let type = /** @type {import('../internal').ComponentType} */ (internal.type);

	let context = getParentContext(internal);

	// Necessary for createContext api. Setting this property will pass
	// the context value as `this.context` just for this component.
	let tmp = type.contextType;
	let provider = tmp && context[tmp._id];
	let componentContext = tmp
		? provider
			? provider.props.value
			: tmp._defaultValue
		: context;
	// inst.context = componentContext;

	if (provider) provider._subs.add(internal);

	let inst;
	if (flags & TYPE_CLASS) {
		// @ts-ignore `type` is a class component constructor
		inst = new type(props, componentContext);
	} else {
		inst = {
			props,
			context: componentContext,
			forceUpdate: internal.rerender.bind(null, internal)
		};
	}
	inst._internal = internal;
	internal._component = inst;
	internal.flags |= DIRTY_BIT;

	if (!inst.state) inst.state = {};
	if (inst._nextState == null) inst._nextState = inst.state;

	if (type.getDerivedStateFromProps != null) {
		if (inst._nextState == inst.state) {
			inst._nextState = Object.assign({}, inst._nextState);
		}

		Object.assign(
			inst._nextState,
			type.getDerivedStateFromProps(props, inst._nextState)
		);
	} else if (inst.componentWillMount != null) {
		inst.componentWillMount();
	}

	// Enqueue componentDidMount to run the first time this internal commits
	if (inst.componentDidMount != null) {
		internal._commitCallbacks.push(inst.componentDidMount.bind(inst));
	}

	inst.context = componentContext;
	inst.props = props;
	inst.state = inst._nextState;

	let renderHook = options._render;
	let renderResult;

	let counter = 0;
	while (counter++ < 25) {
		// mark as clean:
		internal.flags &= ~DIRTY_BIT;
		if (renderHook) renderHook(internal);
		if (flags & TYPE_CLASS) {
			renderResult = inst.render(inst.props, inst.state, inst.context);
			// note: disable repeat render invocation for class components
			break;
		} else {
			renderResult = type.call(inst, inst.props, inst.context);
		}
		// re-render if marked as dirty:
		if (!(internal.flags & DIRTY_BIT)) {
			break;
		}
	}
	// internal.flags &= ~DIRTY_BIT;

	// Handle setState called in render, see #2553
	inst.state = inst._nextState;

	if (inst.getChildContext != null) {
		internal._context = Object.assign({}, context, inst.getChildContext());
	}

	if (renderResult == null) {
		return startDom;
	}

	if (typeof renderResult === 'object') {
		if (renderResult.type === Fragment && renderResult.key == null) {
			renderResult = renderResult.props.children;
		}
		if (!Array.isArray(renderResult)) {
			renderResult = [renderResult];
		}
	} else {
		renderResult = [renderResult];
	}

	return mountChildren(internal, renderResult, parentDom, startDom);
}

/**
 * Construct (or select, if hydrating) a new DOM element for the given Internal.
 * @param {import('../internal').Internal} internal
 * @param {import('../internal').PreactElement} dom A DOM node to attempt to re-use during hydration
 * @returns {import('../internal').PreactNode}
 */
function mountElement(internal, dom) {
	let nodeType = internal.type;
	let flags = internal.flags;
	let newProps = internal.props;

	// Are we rendering within an inline SVG?
	let isSvg = flags & MODE_SVG;

	// Are we *not* hydrating? (a top-level render() or mutative hydration):
	let isFullRender = ~flags & MODE_HYDRATE;

	let hydrateChild = null;
	let nextDomSibling;

	// If hydrating (hydrate() or render() with replaceNode), find the matching child:
	// Note: this flag guard is redundant, since `dom` is only non-null when hydrating.
	// It has been left here purely for filesize reasons, as it saves 5b.
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

		// We're creating a new node, which means its subtree is also new.
		// If we were hydrating, this "deopts" the subtree into normal rendering mode.
		internal.flags = flags &= RESET_MODE;
		isFullRender = 1;
	}

	internal._dom = dom;

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

	// Install controlled input markers
	if (
		(nodeType === 'input' ||
			nodeType === 'textarea' ||
			nodeType === 'select') &&
		(newProps.onInput || newProps.onChange)
	) {
		if (newValue != null) {
			dom._isControlled = true;
			dom._prevValue = newValue;
		} else if (newProps.checked != null) {
			dom._isControlled = true;
			dom._prevValue = newProps.checked;
		}
	}

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
			hydrateChild // isNew ? null : dom.firstChild
		);
	}

	// (as above, don't diff props during hydration)
	if (isFullRender && newValue != null) {
		setProperty(dom, 'value', newValue, null, 0);
	}

	// @ts-ignore
	return nextDomSibling;
	// return isNew ? null : dom.nextSibling;
}

/**
 * Mount all children of an Internal
 * @param {import('../internal').Internal} internal The parent Internal of the given children
 * @param {import('../internal').ComponentChild[]} children
 * @param {import('../internal').PreactElement} parentDom The element into which this subtree should be inserted
 * @param {import('../internal').PreactNode} startDom
 */
export function mountChildren(internal, children, parentDom, startDom) {
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
			parentDom.insertBefore(newDom, startDom);
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
