import { diffChildren, insertComponentDom } from './children';
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
import { getDomSibling } from '../tree';

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
			let prevProps = internal.props;
			let prevParentDom = parentDom;
			if (internal._flags & TYPE_ROOT) {
				parentDom = newVNode.props._parentDom;

				// TODO: Investigate if we could consolidate the logic below to here.
				// Might be related to the mountChildren/startDom usage in
				// renderComponent

				// if (internal.props._parentDom !== newVNode.props._parentDom) {
				// 	let nextSibling =
				// 		parentDom == prevParentDom ? getDomSibling(internal) : null;
				// 	insertComponentDom(internal, nextSibling, parentDom);
				// }
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

			if (internal._flags & TYPE_ROOT && prevProps._parentDom !== parentDom) {
				// If this Root node's _parentDom prop has changed, reparent its
				// children under the new parentDom.
				//
				// If the new parentDom is the same as the root node's parentDom (in
				// other words, this root node should behave like a Fragment), then find
				// the root node's sibling to insert its children before
				let nextSibling =
					parentDom == prevParentDom ? getDomSibling(internal) : null;
				insertComponentDom(internal, nextSibling, parentDom);
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

	diffProps(dom, newProps, oldProps, internal._flags & MODE_SVG);

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
