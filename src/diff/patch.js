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
	let tmp,
		newType = newVNode.type;

	// When passing through createElement it assigns the object
	// constructor as undefined. This to prevent JSON-injection.
	if (newVNode.constructor !== undefined) return null;
	if ((tmp = options._diff)) tmp(newVNode);

	/** @type {import('../internal').PreactElement} */
	let nextDomSibling;

	try {
		if (typeof newType == 'function') {
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
			nextDomSibling = newVNode._dom.nextSibling;
		}

		if ((tmp = options.diffed)) tmp(newVNode);
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
	let i;
	let oldProps = oldVNode.props;
	let newProps = newVNode.props;

	if (newVNode.type === null) {
		if (oldProps !== newProps) {
			dom.data = newProps;
		}
	} else {
		// Tracks entering and exiting SVG namespace when descending through the tree.
		isSvg = newVNode.type === 'svg' || isSvg;

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
			i = newVNode.props.children;
			diffChildren(
				dom,
				Array.isArray(i) ? i : [i],
				newVNode,
				oldVNode,
				globalContext,
				newVNode.type === 'foreignObject' ? false : isSvg,
				commitQueue,
				// Find the first non-null child with a dom pointer and begin the diff
				// with that (i.e. what getDomSibling does)
				getDomSibling(oldVNode, 0)
			);
		}

		if (
			'value' in newProps &&
			(i = newProps.value) !== undefined &&
			// #2756 For the <progress>-element the initial value is 0,
			// despite the attribute not being present. When the attribute
			// is missing the progress bar is treated as indeterminate.
			// To fix that we'll always update it when it is 0 for progress elements
			(i !== dom.value || (newVNode.type === 'progress' && !i))
		) {
			setProperty(dom, 'value', i, oldProps.value, false);
		}
		if (
			'checked' in newProps &&
			(i = newProps.checked) !== undefined &&
			i !== dom.checked
		) {
			setProperty(dom, 'checked', i, oldProps.checked, false);
		}
	}

	return dom;
}
