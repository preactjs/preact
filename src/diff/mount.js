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
	TYPE_ROOT,
	MODE_SVG
} from '../constants';
import { normalizeToVNode } from '../create-element';
import { renderComponent } from './component';
import { createInternal } from '../tree';
import options from '../options';
import {
	op,
	OP_CREATE_ELEMENT,
	OP_CREATE_TEXT,
	OP_INSERT,
	OP_REMOVE,
	OP_REMOVE_PROP,
	OP_SET_HTML,
	OP_SET_PROP,
	OP_SET_TEXT
} from './commit';

/**
 * Diff two virtual nodes and apply proper changes to the DOM
 * @param {import('../internal').PreactElement} parentDom The parent of the DOM element
 * @param {import('../internal').VNode | string} newVNode The new virtual node
 * @param {import('../internal').Internal} internal The Internal node to mount
 * @param {object} globalContext The current context object. Modified by getChildContext
 * @param {import('../internal').CommitQueue} commitQueue List of components
 * which have callbacks to invoke in commitRoot
 * @param {any[]} refs List of refs
 * @param {import('../internal').PreactElement} startDom
 * @returns {import('../internal').PreactElement | null} pointer to the next DOM node to be hydrated (or null)
 */
export function mount(
	parentDom,
	newVNode,
	internal,
	globalContext,
	commitQueue,
	refs,
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
				commitQueue,
				refs,
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
				commitQueue,
				refs
			);
		}

		if (options.diffed) options.diffed(internal);

		// We successfully rendered this VNode, unset any stored hydration/bailout state:
		internal._flags &= RESET_MODE;
	} catch (e) {
		internal._vnodeId = 0;
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
 * @param {import('../internal').CommitQueue} commitQueue List of components
 * which have callbacks to invoke in commitRoot
 * @param {any[]} refs List of refs
 * @returns {import('../internal').PreactElement}
 */
function mountDOMElement(dom, internal, globalContext, commitQueue, refs) {
	let newProps = internal.props;
	let nodeType = internal.type;
	/** @type {any} */
	let i, value;

	let flags = internal._flags;
	let isSvg = flags & MODE_SVG;

	// Are we *not* hydrating? (a top-level render() or mutative hydration):
	let isFullRender = ~flags & MODE_HYDRATE;

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
			// dom = document.createTextNode(newProps);
			op(OP_CREATE_TEXT, internal, newProps, undefined);
		} else if (dom.data !== newProps) {
			// dom.data = newProps;
			op(OP_SET_TEXT, internal, newProps, dom);
		}

		// internal._dom = dom;
	} else {
		// Tracks entering and exiting SVG namespace when descending through the tree.
		// if (nodeType === 'svg') internal._flags |= MODE_SVG;

		if (isNew) {
			op(OP_CREATE_ELEMENT, internal, nodeType, newProps);
			dom = internal._dom;
			// if (isSvg) {
			// 	dom = document.createElementNS(
			// 		'http://www.w3.org/2000/svg',
			// 		// @ts-ignore We know `newVNode.type` is a string
			// 		nodeType
			// 	);
			// } else {
			// 	dom = document.createElement(
			// 		// @ts-ignore We know `newVNode.type` is a string
			// 		nodeType,
			// 		newProps.is && newProps
			// 	);
			// }

			// we are creating a new node, so we can assume this is a new subtree (in case we are hydrating), this deopts the hydrate
			internal._flags = flags &= RESET_MODE;
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
					op(OP_REMOVE_PROP, internal, dom, value);
					// dom.removeAttribute(value);
				}
			}
		}

		let newHtml, newValue, newChildren;
		for (i in newProps) {
			value = newProps[i];
			if (i === 'key') {
			} else if (i === 'children') {
				newChildren = value;
			} else if (i === 'dangerouslySetInnerHTML') {
				newHtml = value;
			} else if (i === 'value') {
				newValue = value;
			} else if (
				value != null &&
				(isFullRender || typeof value === 'function')
			) {
				// setProperty(dom, i, value, null, isSvg);
				op(OP_SET_PROP, internal, i, value);
			}
		}

		internal._dom = dom;

		// If the new vnode didn't have dangerouslySetInnerHTML, diff its children
		if (newHtml) {
			if (isFullRender && newHtml.__html) {
				op(OP_SET_HTML, internal, newHtml.__html);
				// dom.innerHTML = newHtml.__html;
			}
			internal._children = null;
		} else if (newChildren != null) {
			mountChildren(
				dom,
				newChildren && Array.isArray(newChildren) ? newChildren : [newChildren],
				internal,
				globalContext,
				commitQueue,
				refs,
				isNew ? null : dom.firstChild
			);
		}

		// (as above, don't diff props during hydration)
		if (isFullRender && newValue != null) {
			op(OP_SET_PROP, internal, 'value', newValue, null);
			// setProperty(dom, 'value', newValue, null, 0);
		}
	}

	// @ts-ignore
	return isNew ? null : dom.nextSibling;
}

/**
 * Diff the children of a virtual node
 * @param {import('../internal').PreactElement} parentDom The DOM element whose
 * children are being diffed
 * @param {import('../internal').ComponentChildren[]} renderResult
 * @param {import('../internal').Internal} parentInternal The parent Internal of the given children
 * @param {object} globalContext The current context object - modified by getChildContext
 * @param {import('../internal').CommitQueue} commitQueue List of components
 * which have callbacks to invoke in commitRoot
 * @param {any[]} refs List of refs
 * @param {import('../internal').PreactElement} startDom
 */
export function mountChildren(
	parentDom,
	renderResult,
	parentInternal,
	globalContext,
	commitQueue,
	refs,
	startDom
) {
	let internalChildren = (parentInternal._children = []),
		i,
		childVNode,
		childInternal,
		newDom,
		mountedNextChild;

	for (i = 0; i < renderResult.length; i++) {
		childVNode = normalizeToVNode(renderResult[i]);

		// Terser removes the `continue` here and wraps the loop body
		// in a `if (childVNode) { ... } condition
		if (childVNode == null) {
			internalChildren[i] = null;
			continue;
		}

		childInternal = createInternal(childVNode, parentInternal);
		internalChildren[i] = childInternal;

		// Morph the old element into the new one, but don't append it to the dom yet
		mountedNextChild = mount(
			parentDom,
			childVNode,
			childInternal,
			globalContext,
			commitQueue,
			refs,
			startDom
		);

		newDom = childInternal._dom;

		const flags = childInternal._flags;
		if (flags & TYPE_COMPONENT) {
			// If the child is a Fragment-like or if it is DOM VNode and its _dom
			// property matches the dom we are diffing (i.e. startDom), just
			// continue with the mountedNextChild
			startDom = mountedNextChild;
		} else if (flags & (TYPE_ELEMENT | TYPE_TEXT)) {
			// The DOM the diff should begin with is now startDom (since we inserted
			// newDom before startDom) so ignore mountedNextChild and continue with
			// startDom
			op(OP_INSERT, childInternal, undefined, undefined);
			// parentDom.insertBefore(newDom, startDom);
		}

		if (childInternal.ref) {
			refs.push(null, childInternal.ref, childInternal);
			// applyRef(
			// 	null,
			// 	childInternal.ref,
			// 	childInternal._component || newDom,
			// 	childInternal
			// );
		}
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
			op(OP_REMOVE, parentInternal, i, undefined);
		}
	}

	return startDom;
}
