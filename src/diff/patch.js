import { diffChildren, reorderChildren } from './children';
import { diffProps, setProperty } from './props';
import options from '../options';
import { renderComponent } from './component';
import {
	TYPE_COMPONENT,
	RESET_MODE,
	TYPE_TEXT,
	MODE_SUSPENDED,
	MODE_ERRORED,
	TYPE_ROOT,
	MODE_SVG
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
	if (newVNode.constructor !== undefined) return null;

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
		} else if (newVNode._vnodeId !== internal._vnodeId) {
			nextDomSibling = patchDOMElement(
				internal._dom,
				newVNode,
				internal,
				globalContext,
				commitQueue
			);
		} else {
			// @ts-ignore Trust me TS, nextSibling is a PreactElement
			nextDomSibling = internal._dom.nextSibling;
		}

		if (options.diffed) options.diffed(internal);

		// We successfully rendered this VNode, unset any stored hydration/bailout state:
		internal._flags &= RESET_MODE;
		// Once we have successfully rendered the new VNode, copy it's ID over
		internal._vnodeId = newVNode._vnodeId;
	} catch (e) {
		if (e.then) {
			// If a promise was thrown, reorderChildren in case this component is
			// being hidden or moved
			reorderChildren(internal, startDom, parentDom);
		}

		// @TODO: assign a new VNode ID here? Or NaN?
		// newVNode._vnodeId = null;
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
 * @returns {import('../internal').PreactElement}
 */
function patchDOMElement(dom, newVNode, internal, globalContext, commitQueue) {
	let oldProps = internal.props;
	let newProps = newVNode.props;
	let newType = newVNode.type;
	let tmp;

	let oldHtml = oldProps.dangerouslySetInnerHTML;
	let newHtml = newProps.dangerouslySetInnerHTML;

	if (newHtml || oldHtml) {
		// Avoid re-applying the same '__html' if it did not changed between re-render
		if (
			!newHtml ||
			((!oldHtml || newHtml.__html != oldHtml.__html) &&
				newHtml.__html !== dom.innerHTML)
		) {
			dom.innerHTML = (newHtml && newHtml.__html) || '';
		}
	}

	internal.props = newProps;

	diffProps(dom, newProps, oldProps, (internal._flags & MODE_SVG) !== 0);

	internal._dom = dom;

	// If the new vnode didn't have dangerouslySetInnerHTML, diff its children
	if (newHtml) {
		internal._children = null;
	} else {
		tmp = newVNode.props.children;
		diffChildren(
			dom,
			Array.isArray(tmp) ? tmp : [tmp],
			internal,
			globalContext,
			commitQueue,
			dom.firstChild
		);
	}

	if (
		'value' in newProps &&
		(tmp = newProps.value) !== undefined &&
		// #2756 For the <progress>-element the initial value is 0,
		// despite the attribute not being present. When the attribute
		// is missing the progress bar is treated as indeterminate.
		// To fix that we'll always update it when it is 0 for progress elements
		(tmp !== dom.value || (newType === 'progress' && !tmp))
	) {
		setProperty(dom, 'value', tmp, oldProps.value, false);
	}
	if (
		'checked' in newProps &&
		(tmp = newProps.checked) !== undefined &&
		tmp !== dom.checked
	) {
		setProperty(dom, 'checked', tmp, oldProps.checked, false);
	}

	// @ts-ignore Trust me TS, nextSibling is a PreactElement
	return dom.nextSibling;
}
