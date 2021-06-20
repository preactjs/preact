/* eslint no-fallthrough: "off" */

import { diffChildren } from './children';
import { setProperty } from './props';
import options from '../options';
import { renderComponent } from './component';
import {
	TYPE_COMPONENT,
	RESET_MODE,
	TYPE_TEXT,
	MODE_SUSPENDED,
	MODE_ERRORED,
	TYPE_ROOT,
	MODE_SVG,
	UNDEFINED
} from '../constants';
import { getChildDom, getDomSibling } from '../tree';

/**
 * Diff two virtual nodes and apply proper changes to the DOM
 * @param {import('../internal').PreactElement} parentDom The parent of the DOM element
 * @param {import('../internal').VNode | string} newVNode The new virtual node
 * @param {import('../internal').Internal} internal The Internal node to patch
 * @param {object} globalContext The current context object. Modified by getChildContext
 * @param {import('../internal').CommitQueue} commitQueue List of components
 * which have callbacks to invoke in commitRoot
 * @param {import('../internal').PreactNode} startDom
 */
export function patch(
	parentDom,
	newVNode,
	internal,
	globalContext,
	commitQueue,
	startDom
) {
	if (internal._flags & TYPE_TEXT) {
		if (newVNode !== internal.props) {
			internal._dom.data = newVNode;
			internal.props = newVNode;
		}
		return internal._dom.nextSibling;
	}

	// When passing through createElement it assigns the object
	// constructor as undefined. This to prevent JSON-injection.
	if (newVNode.constructor !== UNDEFINED) return null;

	if (options._diff) options._diff(internal, newVNode);

	/** @type {import('../internal').PreactNode} */
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
					let newStartDom = getChildDom(internal);
					if (newStartDom) {
						startDom = newStartDom;
					}

					// The `startDom` variable might point to a node from another
					// tree from a previous render
					if (startDom != null && startDom.parentNode !== parentDom) {
						startDom = null;
					}
				}
			}

			nextDomSibling = renderComponent(
				parentDom,
				/** @type {import('../internal').VNode} */
				(newVNode),
				internal,
				globalContext,
				commitQueue,
				startDom
			);

			if (internal._flags & TYPE_ROOT && prevParentDom !== parentDom) {
				// If this is a root node/Portal, and it changed the parentDom it's
				// children, then we need to determine which dom node the diff should
				// continue with.
				if (prevStartDom == null || prevStartDom.parentNode == prevParentDom) {
					// If prevStartDom == null, then we are diffing a root node that
					// didn't have a startDom to begin with, so we can just return null.
					//
					// Or, if the previous value for start dom still has the same parent
					// DOM has the root node's parent tree, then we can use it. This case
					// assumes the root node rendered its children into a new parent.
					nextDomSibling = prevStartDom;
				} else {
					// Here, if the parentDoms are different and prevStartDom has moved into
					// a new parentDom, we'll assume the root node moved prevStartDom under
					// the new parentDom. Because of this change, we need to search the
					// internal tree for the next DOM sibling the tree should begin with
					nextDomSibling = getDomSibling(internal);
				}
			}
		} else {
			if (newVNode._vnodeId !== internal._vnodeId) {
				patchDOMElement(
					internal._dom,
					newVNode,
					internal,
					globalContext,
					commitQueue
				);
			}
			// @ts-ignore Trust me TS, nextSibling is a PreactElement
			nextDomSibling = internal._dom.nextSibling;
		}

		if (options.diffed) options.diffed(internal);

		// We successfully rendered this VNode, unset any stored hydration/bailout state:
		internal._flags &= RESET_MODE;
		// Once we have successfully rendered the new VNode, copy it's ID over
		internal._vnodeId = newVNode._vnodeId;
	} catch (e) {
		// @TODO: assign a new VNode ID here? Or NaN?
		// newVNode._vnodeId = 0;
		internal._flags |= e.then ? MODE_SUSPENDED : MODE_ERRORED;
		options._catchError(e, internal);
	}

	return nextDomSibling;
}

/**
 * Diff two virtual nodes representing DOM element
 * @param {import('../internal').PreactElement} dom The DOM element representing
 * the virtual nodes being diffed
 * @param {import('../internal').VNode} newVNode The new virtual node
 * @param {import('../internal').Internal} internal The Internal node to patch
 * @param {object} globalContext The current context object
 * @param {import('../internal').CommitQueue} commitQueue List of components
 * which have callbacks to invoke in commitRoot
 */
function patchDOMElement(dom, newVNode, internal, globalContext, commitQueue) {
	let oldProps = internal.props,
		newProps = (internal.props = newVNode.props),
		isSvg = internal._flags & MODE_SVG,
		i,
		value,
		tmp,
		newHtml,
		oldHtml,
		// newValue,
		// newChecked,
		newChildren;

	for (i in oldProps) {
		value = oldProps[i];
		switch (i) {
			case 'dangerouslySetInnerHTML':
				oldHtml = value;
			case 'key':
			case 'children':
				break;
			default:
				if (!(i in newProps)) setProperty(dom, i, null, value, isSvg);
		}
	}

	for (i in newProps) {
		value = newProps[i];
		switch (i) {
			case 'children':
				newChildren = value;
			case 'dangerouslySetInnerHTML':
				newHtml = value;
			case 'key':
				break;
			default:
				if (value !== (tmp = oldProps[i]))
					setProperty(dom, i, value, tmp, isSvg);
		}
	}

	// If the new vnode didn't have dangerouslySetInnerHTML, diff its children
	if (newHtml) {
		// Avoid re-applying the same '__html' if it did not changed between re-render
		if (
			!oldHtml ||
			(newHtml.__html !== oldHtml.__html && newHtml.__html !== dom.innerHTML)
		) {
			dom.innerHTML = newHtml && newHtml.__html;
		}
		internal._children = null;
	} else {
		if (oldHtml) dom.innerHTML = '';

		diffChildren(
			dom,
			Array.isArray(newChildren) ? newChildren : [newChildren],
			internal,
			globalContext,
			commitQueue,
			dom.firstChild
		);
	}

	i = 'value';
	value = newProps[i];
	if (value !== UNDEFINED && i in dom && value !== dom[i]) {
		setProperty(dom, i, value, null, 0);
	}
	i = 'checked';
	value = newProps[i];
	if (value !== UNDEFINED && i in dom && value !== dom[i]) {
		setProperty(dom, i, value, null, 0);
	}
}
