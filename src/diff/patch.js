import { diffChildren } from './children';
import { diffProps, setProperty } from './props';
import options from '../options';
import { getDomSibling } from '../component';
import { renderComponent } from './component';

/**
 * Diff two virtual nodes and apply proper changes to the DOM
 * @param {import('../internal').PreactElement} parentDom The parent of the DOM element
 * @param {import('../internal').VNode} newVNode The new virtual node
 * @param {import('../internal').VNode} oldVNode The old virtual node
 * @param {object} globalContext The current context object. Modified by getChildContext
 * @param {boolean} isSvg Whether or not this element is an SVG node
 * @param {Array<import('../internal').Component>} commitQueue List of components
 * which have callbacks to invoke in commitRoot
 * @param {import('../internal').PreactElement} startDom
 */
export function patch(
	parentDom,
	newVNode,
	oldVNode,
	globalContext,
	isSvg,
	commitQueue,
	startDom
) {
	// When passing through createElement it assigns the object
	// constructor as undefined. This to prevent JSON-injection.
	if (newVNode.constructor !== undefined) return null;

	if (options._diff) options._diff(newVNode);

	/** @type {import('../internal').PreactElement} */
	let nextDomSibling;

	try {
		if (typeof newVNode.type == 'function') {
			nextDomSibling = renderComponent(
				parentDom,
				newVNode,
				oldVNode,
				globalContext,
				isSvg,
				commitQueue,
				startDom
			);
		} else if (newVNode._original === oldVNode._original) {
			newVNode._children = oldVNode._children;
			newVNode._dom = oldVNode._dom;
			nextDomSibling = newVNode._dom.nextSibling;
		} else {
			newVNode._dom = patchDOMElement(
				oldVNode._dom,
				newVNode,
				oldVNode,
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
		options._catchError(e, newVNode, oldVNode);
	}

	return nextDomSibling;
}

/**
 * Diff two virtual nodes representing DOM element
 * @param {import('../internal').PreactElement} dom The DOM element representing
 * the virtual nodes being diffed
 * @param {import('../internal').VNode} newVNode The new virtual node
 * @param {import('../internal').VNode} oldVNode The old virtual node
 * @param {object} globalContext The current context object
 * @param {boolean} isSvg Whether or not this DOM node is an SVG node
 * @param {Array<import('../internal').Component>} commitQueue List of components
 * which have callbacks to invoke in commitRoot
 * @returns {import('../internal').PreactElement}
 */
function patchDOMElement(
	dom,
	newVNode,
	oldVNode,
	globalContext,
	isSvg,
	commitQueue
) {
	let oldProps = oldVNode.props;
	let newProps = newVNode.props;
	let newType = newVNode.type;
	let tmp;

	if (newType === null) {
		if (oldProps !== newProps) {
			dom.data = newProps;
		}
	} else {
		// Tracks entering and exiting SVG namespace when descending through the tree.
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
			newVNode._children = [];
		} else {
			tmp = newVNode.props.children;
			diffChildren(
				dom,
				Array.isArray(tmp) ? tmp : [tmp],
				newVNode,
				oldVNode,
				globalContext,
				isSvg && newType !== 'foreignObject',
				commitQueue,
				// Find the first non-null child with a dom pointer and begin the diff
				// with that (i.e. what getDomSibling does)
				getDomSibling(oldVNode, 0)
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

	return dom;
}
