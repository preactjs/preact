import { applyRef } from './refs';
import {
	TYPE_COMPONENT,
	TYPE_ELEMENT,
	MODE_HYDRATE,
	MODE_MUTATIVE_HYDRATE,
	MODE_SUSPENDED,
	RESET_MODE,
	TYPE_TEXT,
	MODE_ERRORED,
	TYPE_ROOT
} from '../constants';
import { normalizeToVNode } from '../create-element';
import { setProperty } from './props';
import { renderComponent } from './component';
import { createInternal } from '../tree';
import options from '../options';
import { removeNode } from '../util';

/**
 * Diff two virtual nodes and apply proper changes to the DOM
 * @param {import('../internal').PreactElement} parentDom The parent of the DOM element
 * @param {import('../internal').VNode | string} newVNode The new virtual node
 * @param {import('../internal').Internal} internal The Internal node to mount
 * @param {object} globalContext The current context object. Modified by getChildContext
 * @param {boolean} isSvg Whether or not this element is an SVG node
 * @param {Array<import('../internal').Component>} commitQueue List of components
 * which have callbacks to invoke in commitRoot
 * @param {import('../internal').PreactElement} startDom
 * @returns {import('../internal').PreactElement | null} pointer to the next DOM node to be hydrated (or null)
 */
export function mount(
	parentDom,
	newVNode,
	internal,
	globalContext,
	isSvg,
	commitQueue,
	startDom
) {
	if (options._diff) options._diff(internal, newVNode);

	/** @type {import('../internal').PreactElement} */
	let nextDomSibling;

	try {
		if (internal._flags & TYPE_COMPONENT) {
			// Root nodes signal that an attempt to render into a specific DOM node on
			// the page. Root nodes can occur anywhere in the tree and not just at the
			// top.
			let prevStartDom = startDom;
			let prevParentDom = parentDom;
			if (internal._flags & TYPE_ROOT) {
				parentDom = newVNode.props._parentDom;

				if (parentDom !== prevParentDom) {
					startDom = null;
				}
			}

			nextDomSibling = renderComponent(
				parentDom,
				null,
				internal,
				globalContext,
				isSvg,
				commitQueue,
				startDom
			);

			if (internal._flags & TYPE_ROOT && prevParentDom !== parentDom) {
				// If we just mounted a root node/Portal, and it changed the parentDom
				// of it's children, then we need to resume the diff from it's previous
				// startDom element, which could be null if we are mounting an entirely
				// new tree, or the portal's nextSibling if we are mounting a Portal in
				// an existing tree.
				nextDomSibling = prevStartDom;
			}
		} else {
			let hydrateDom =
				internal._flags & (MODE_HYDRATE | MODE_MUTATIVE_HYDRATE)
					? startDom
					: null;

			nextDomSibling = mountDOMElement(
				hydrateDom,
				internal,
				globalContext,
				isSvg,
				commitQueue
			);
		}

		if (options.diffed) options.diffed(internal);

		// We successfully rendered this VNode, unset any stored hydration/bailout state:
		internal._flags &= RESET_MODE;
	} catch (e) {
		internal._vnodeId = null;
		internal._flags |= e.then ? MODE_SUSPENDED : MODE_ERRORED;

		if (internal._flags & MODE_HYDRATE) {
			// @ts-ignore Trust me TS, nextSibling is a PreactElement
			nextDomSibling = startDom && startDom.nextSibling;
			internal._dom = startDom; // Save our current DOM position to resume later
		}
		options._catchError(e, internal);
	}

	return nextDomSibling;
}

/**
 * Diff two virtual nodes representing DOM element
 * @param {import('../internal').PreactElement} dom The DOM element representing
 * the virtual nodes being diffed
 * @param {import('../internal').Internal} internal The Internal node to mount
 * @param {object} globalContext The current context object
 * @param {boolean} isSvg Whether or not this DOM node is an SVG node
 * @param {Array<import('../internal').Component>} commitQueue List of components
 * which have callbacks to invoke in commitRoot
 * @returns {import('../internal').PreactElement}
 */
function mountDOMElement(dom, internal, globalContext, isSvg, commitQueue) {
	let newProps = internal.props;
	let nodeType = internal.type;
	/** @type {any} */
	let i;

	let isHydrating = internal._flags & MODE_HYDRATE;

	// if hydrating (hydrate() or render() with replaceNode), find the matching child:
	if (internal._flags & (MODE_HYDRATE | MODE_MUTATIVE_HYDRATE)) {
		while (
			dom &&
			(nodeType ? dom.localName !== nodeType : dom.nodeType !== 3)
		) {
			dom = dom.nextSibling;
		}
	}

	if (internal._flags & TYPE_TEXT) {
		if (dom == null) {
			// @ts-ignore createTextNode returns Text, we expect PreactElement
			dom = document.createTextNode(newProps);
		} else if (dom.data !== newProps) {
			dom.data = newProps;
		}

		internal._dom = dom;
	} else {
		// Tracks entering and exiting SVG namespace when descending through the tree.
		if (nodeType === 'svg') isSvg = true;

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
			isHydrating = 0;
			internal._flags &= RESET_MODE;
		}

		// @TODO: Consider removing and instructing users to instead set the desired
		// prop for removal to undefined/null. During hydration, props are not
		// diffed at all (including dangerouslySetInnerHTML)
		if (internal._flags & MODE_MUTATIVE_HYDRATE) {
			// But, if we are in a situation where we are using existing DOM (e.g. replaceNode)
			// we should read the existing DOM attributes to diff them
			for (i = 0; i < dom.attributes.length; i++) {
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

		internal._dom = dom;

		// If the new vnode didn't have dangerouslySetInnerHTML, diff its children
		if (newHtml) {
			if (!isHydrating && newHtml.__html) {
				dom.innerHTML = newHtml.__html;
			}
			internal._children = null;
		} else if ((i = internal.props.children) != null) {
			mountChildren(
				dom,
				Array.isArray(i) ? i : [i],
				internal,
				globalContext,
				isSvg && nodeType !== 'foreignObject',
				commitQueue,
				dom.firstChild
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

	// @ts-ignore
	return dom.nextSibling;
}

/**
 * Diff the children of a virtual node
 * @param {import('../internal').PreactElement} parentDom The DOM element whose
 * children are being diffed
 * @param {import('../internal').ComponentChildren[]} renderResult
 * @param {import('../internal').Internal} parentInternal The parent Internal of the given children
 * @param {object} globalContext The current context object - modified by getChildContext
 * @param {boolean} isSvg Whether or not this DOM node is an SVG node
 * @param {Array<import('../internal').Component>} commitQueue List of components
 * which have callbacks to invoke in commitRoot
 * @param {import('../internal').PreactElement} startDom
 */
export function mountChildren(
	parentDom,
	renderResult,
	parentInternal,
	globalContext,
	isSvg,
	commitQueue,
	startDom
) {
	let i, childVNode, childInternal, newDom, firstChildDom, mountedNextChild;

	parentInternal._children = [];
	for (i = 0; i < renderResult.length; i++) {
		childVNode = normalizeToVNode(renderResult[i]);

		// Terser removes the `continue` here and wraps the loop body
		// in a `if (childVNode) { ... } condition
		if (childVNode == null) {
			parentInternal._children[i] = null;
			continue;
		}

		childInternal = createInternal(childVNode, parentInternal);
		parentInternal._children[i] = childInternal;

		// Morph the old element into the new one, but don't append it to the dom yet
		mountedNextChild = mount(
			parentDom,
			childVNode,
			childInternal,
			globalContext,
			isSvg,
			commitQueue,
			startDom
		);

		newDom = childInternal._dom;

		if (newDom != null) {
			if (
				firstChildDom == null &&
				// TODO: Revisit (remove?) this condition when we remove _dom pointers
				// on component internals. Note, the parentNode == parentDom check is
				// cuz if this Portal is a passthrough (_parentDom prop matches
				// parentDom) then we should look at the dom it returns and bubble it up
				(!(childInternal._flags & TYPE_ROOT) || newDom.parentNode == parentDom)
			) {
				firstChildDom = newDom;
			}

			if (childInternal._flags & TYPE_COMPONENT || newDom == startDom) {
				// If the child is a Fragment-like or if it is DOM VNode and its _dom
				// property matches the dom we are diffing (i.e. startDom), just
				// continue with the mountedNextChild
				startDom = mountedNextChild;
			} else {
				// The DOM the diff should begin with is now startDom (since we inserted
				// newDom before startDom) so ignore mountedNextChild and continue with
				// startDom
				parentDom.insertBefore(newDom, startDom);
			}
		}

		if (childInternal.ref) {
			applyRef(
				childInternal.ref,
				childInternal._component || newDom,
				childInternal
			);
		}
	}

	if (parentInternal._flags & TYPE_COMPONENT) {
		parentInternal._dom = firstChildDom;
	}

	// Remove children that are not part of any vnode.
	if (
		parentInternal._flags & (MODE_HYDRATE | MODE_MUTATIVE_HYDRATE) &&
		parentInternal._flags & TYPE_ELEMENT
	) {
		// TODO: Would it be simpler to just clear the pre-existing DOM in top-level
		// render if render is called with no oldVNode & existing children & no
		// replaceNode? Instead of patching the DOM to match the VNode tree? (remove
		// attributes & unused DOM)
		while (startDom) {
			i = startDom;
			startDom = startDom.nextSibling;
			removeNode(i);
		}
	}

	return startDom;
}
