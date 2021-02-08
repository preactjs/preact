import { diffChildren } from './children';
import { diffProps, setProperty } from './props';
import options from '../options';
import { renderComponent } from './component';
import { COMPONENT_NODE, TEXT_NODE } from '../constants';

/**
 * Diff two virtual nodes and apply proper changes to the DOM
 * @param {import('../internal').PreactElement} parentDom The parent of the DOM element
 * @param {import('../internal').VNode | string} newVNode The new virtual node
 * @param {import('../internal').Internal} internal The Internal node to patch
 * @param {object} globalContext The current context object. Modified by getChildContext
 * @param {boolean} isSvg Whether or not this element is an SVG node
 * @param {Array<import('../internal').Component>} commitQueue List of components
 * which have callbacks to invoke in commitRoot
 * @param {import('../internal').PreactNode} startDom
 */
export function patch(
	parentDom,
	newVNode,
	internal,
	globalContext,
	isSvg,
	commitQueue,
	startDom
) {
	if (internal._flags & TEXT_NODE) {
		if (newVNode !== internal.props) {
			internal._dom.data = newVNode;
			internal.props = newVNode;
		}
		return internal._dom.nextSibling;
	}

	// When passing through createElement it assigns the object
	// constructor as undefined. This to prevent JSON-injection.
	if (newVNode.constructor !== undefined) return null;

	// @TODO newVNode is pretty useless here, it contains no tree information
	if (options._diff) options._diff(newVNode);

	/** @type {import('../internal').PreactNode} */
	let nextDomSibling;

	try {
		if (internal._flags & COMPONENT_NODE) {
			nextDomSibling = renderComponent(
				parentDom,
				/** @type {import('../internal').VNode} */
				(newVNode),
				internal,
				globalContext,
				isSvg,
				commitQueue,
				startDom
			);
		} else if (newVNode._original !== internal._original) {
			patchDOMElement(
				internal._dom,
				newVNode,
				internal,
				globalContext,
				isSvg,
				commitQueue
			);

			// @ts-ignore Trust me TS, nextSibling is a PreactElement
			nextDomSibling = newVNode._dom.nextSibling;
		}

		if (options.diffed) options.diffed(newVNode);
	} catch (e) {
		newVNode._original = null;
		options._catchError(e, newVNode, internal);
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
 * @param {boolean} isSvg Whether or not this DOM node is an SVG node
 * @param {Array<import('../internal').Component>} commitQueue List of components
 * which have callbacks to invoke in commitRoot
 * @returns {void}
 */
function patchDOMElement(
	dom,
	newVNode,
	internal,
	globalContext,
	isSvg,
	commitQueue
) {
	let oldProps = internal.props;
	let newProps = newVNode.props;
	let newType = newVNode.type;
	let tmp;

	// Tracks entering and exiting SVG namespace when descending through the tree.
	// @TODO this should happen when creating Internal nodes.
	if (newType === 'svg') isSvg = true;

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

	diffProps(dom, newProps, oldProps, isSvg);

	// If the new vnode didn't have dangerouslySetInnerHTML, diff its children
	if (newHtml) {
		internal._children = [];
	} else {
		tmp = newVNode.props.children;
		diffChildren(
			dom,
			Array.isArray(tmp) ? tmp : [tmp],
			newVNode,
			internal,
			globalContext,
			isSvg && newType !== 'foreignObject',
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
}
