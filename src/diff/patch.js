import { diffChildren } from './children';
import { setProperty } from './props';
import options from '../options';
import { renderComponent } from './component';
import {
	RESET_MODE,
	TYPE_TEXT,
	TYPE_ELEMENT,
	MODE_SUSPENDED,
	MODE_ERRORED,
	TYPE_ROOT,
	MODE_SVG,
	UNDEFINED
} from '../constants';
import { getChildDom, getDomSibling } from '../tree';
import { op, OP_SET_TEXT } from './commit';

/**
 * Diff two virtual nodes and apply proper changes to the DOM
 * @param {import('../internal').PreactElement} parentDom The parent of the DOM element
 * @param {import('../internal').VNode | string} newVNode The new virtual node
 * @param {import('../internal').Internal} internal The Internal node to patch
 * @param {object} globalContext The current context object. Modified by getChildContext
 * @param {import('../internal').CommitQueue} commitQueue List of components
 * which have callbacks to invoke in commitRoot
 * @param {any[]} refs List of refs
 * @param {import('../internal').PreactNode} startDom
 */
export function patch(
	parentDom,
	newVNode,
	internal,
	globalContext,
	commitQueue,
	refs,
	startDom
) {
	let dom = internal._dom;
	let flags = internal._flags;

	if (flags & TYPE_TEXT) {
		if (newVNode !== internal.props) {
			dom.data = newVNode;
			internal.props = newVNode;
			op(OP_SET_TEXT, internal, newVNode, dom);
		}

		return dom.nextSibling;
	}

	// When passing through createElement it assigns the object
	// constructor as undefined. This to prevent JSON-injection.
	if (newVNode.constructor !== UNDEFINED) return null;

	if (options._diff) options._diff(internal, newVNode);

	if (flags & TYPE_ELEMENT) {
		if (newVNode._vnodeId !== internal._vnodeId) {
			// @ts-ignore dom is a PreactElement here
			patchDOMElement(
				dom,
				newVNode,
				internal,
				globalContext,
				commitQueue,
				refs
			);
			// Once we have successfully rendered the new VNode, copy it's ID over
			internal._vnodeId = newVNode._vnodeId;
		}

		if (options.diffed) options.diffed(internal);

		// We successfully rendered this VNode, unset any stored hydration/bailout state:
		internal._flags &= RESET_MODE;

		return dom.nextSibling;
	}

	/** @type {import('../internal').PreactNode} */
	let nextDomSibling;

	// Root nodes signal that an attempt to render into a specific DOM node on
	// the page. Root nodes can occur anywhere in the tree and not just at the
	// top.
	let prevStartDom = startDom;
	let prevParentDom = parentDom;
	if (flags & TYPE_ROOT) {
		parentDom = newVNode.props._parentDom;

		if (parentDom !== prevParentDom) {
			startDom = getChildDom(internal) || startDom;

			// The `startDom` variable might point to a node from another
			// tree from a previous render
			if (startDom != null && startDom.parentNode !== parentDom) {
				startDom = null;
			}
		}
	}

	try {
		nextDomSibling = renderComponent(
			parentDom,
			/** @type {import('../internal').VNode} */
			(newVNode),
			internal,
			globalContext,
			commitQueue,
			refs,
			startDom
		);
	} catch (e) {
		// @TODO: assign a new VNode ID here? Or NaN?
		// newVNode._vnodeId = 0;
		internal._flags |= e.then ? MODE_SUSPENDED : MODE_ERRORED;
		options._catchError(e, internal);

		return nextDomSibling;
	}

	if (prevParentDom !== parentDom) {
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

	if (options.diffed) options.diffed(internal);

	// We successfully rendered this VNode, unset any stored hydration/bailout state:
	internal._flags &= RESET_MODE;
	// Once we have successfully rendered the new VNode, copy it's ID over
	internal._vnodeId = newVNode._vnodeId;

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
 * @param {any[]} refs List of refs
 */
function patchDOMElement(
	dom,
	newVNode,
	internal,
	globalContext,
	commitQueue,
	refs
) {
	let oldProps = internal.props,
		newProps = (internal.props = newVNode.props),
		isSvg = internal._flags & MODE_SVG,
		i,
		value,
		tmp,
		newHtml,
		oldHtml,
		newChildren;

	for (i in oldProps) {
		value = oldProps[i];
		if (i === 'key') {
		} else if (i === 'children') {
		} else if (i === 'dangerouslySetInnerHTML') {
			oldHtml = value;
		} else if (!(i in newProps)) {
			setProperty(dom, i, null, value, isSvg);
		}
	}

	for (i in newProps) {
		value = newProps[i];
		if (i === 'key') {
		} else if (i === 'children') {
			newChildren = value;
		} else if (i === 'dangerouslySetInnerHTML') {
			newHtml = value;
		} else if (
			value !== (tmp = oldProps[i]) ||
			((i === 'checked' || i === 'value') && value != null && value !== dom[i])
		) {
			setProperty(dom, i, value, tmp, isSvg);
		}
	}

	// If the new vnode didn't have dangerouslySetInnerHTML, diff its children
	if (newHtml) {
		value = newHtml.__html;
		// Avoid re-applying the same '__html' if it did not changed between re-render
		if (!oldHtml || (value !== oldHtml.__html && value !== dom.innerHTML)) {
			dom.innerHTML = value;
		}
		internal._children = null;
	} else {
		if (oldHtml) dom.innerHTML = '';

		diffChildren(
			dom,
			newChildren && Array.isArray(newChildren) ? newChildren : [newChildren],
			internal,
			globalContext,
			commitQueue,
			refs,
			dom.firstChild
		);
	}
}
