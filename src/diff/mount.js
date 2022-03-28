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
	MODE_SVG
} from '../constants';
import { normalizeToVNode, Fragment } from '../create-element';
import { setProperty } from './props';
import { renderClassComponent, renderFunctionComponent } from './component';
import { createInternal } from '../tree';
import options from '../options';
import { rendererState } from '../component';
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
	let nextDomSibling;

	try {
		if (internal.flags & TYPE_COMPONENT) {
			// Root nodes signal that an attempt to render into a specific DOM node on
			// the page. Root nodes can occur anywhere in the tree and not just at the
			// top.
			let prevStartDom = startDom;
			let prevParentDom = rendererState._parentDom;
			if (internal.flags & TYPE_ROOT) {
				rendererState._parentDom = newVNode.props._parentDom;

				// Note: this is likely always true because we are inside mount()
				if (rendererState._parentDom !== prevParentDom) {
					startDom = null;
				}
			}

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

			let renderResult;

			if (internal.flags & TYPE_CLASS) {
				renderResult = renderClassComponent(internal, null, componentContext);
			} else {
				renderResult = renderFunctionComponent(
					internal,
					null,
					componentContext
				);
			}

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

			if (
				internal.flags & TYPE_ROOT &&
				prevParentDom !== rendererState._parentDom
			) {
				// If we just mounted a root node/Portal, and it changed the parentDom
				// of it's children, then we need to resume the diff from it's previous
				// startDom element, which could be null if we are mounting an entirely
				// new tree, or the portal's nextSibling if we are mounting a Portal in
				// an existing tree.
				nextDomSibling = prevStartDom;
			}

			rendererState._parentDom = prevParentDom;
			// In the event this subtree creates a new context for its children, restore
			// the previous context for its siblings
			rendererState._context = prevContext;
		} else {
			// @TODO: we could just assign this as internal.dom here
			let hydrateDom =
				internal.flags & (MODE_HYDRATE | MODE_MUTATIVE_HYDRATE)
					? startDom
					: null;

			nextDomSibling = mountElement(internal, hydrateDom);
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
			internal._dom = startDom; // Save our current DOM position to resume later
		}
		options._catchError(e, internal);
	}

	return nextDomSibling;
}

/**
 * Construct (or select, if hydrating) a new DOM element for the given Internal.
 * @param {import('../internal').Internal} internal
 * @param {import('../internal').PreactNode} dom A DOM node to attempt to re-use during hydration
 * @returns {import('../internal').PreactNode}
 */
function mountElement(internal, dom) {
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
			dom = document.createTextNode(newProps);
		} else if (dom.data !== newProps) {
			dom.data = newProps;
		}

		internal._dom = dom;
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
				(isFullRender || typeof value === 'function')
			) {
				setProperty(dom, i, value, null, isSvg);
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
				isNew ? null : dom.firstChild
			);
			rendererState._parentDom = prevParentDom;
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
			rendererState._refQueue.push({
				_internal: childInternal,
				_target: childInternal._component || newDom
			});
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
