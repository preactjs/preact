import { applyRef } from './refs';
import { EMPTY_ARR } from '../constants';
import { normalizeToVNode } from '../create-element';
import { setProperty } from './props';
import { removeNode } from '../util';
import options from '../options';
import { renderComponent } from './component';

/**
 * Diff two virtual nodes and apply proper changes to the DOM
 * @param {import('../internal').PreactElement} parentDom The parent of the DOM element
 * @param {import('../internal').VNode} newVNode The new virtual node
 * @param {object} globalContext The current context object. Modified by getChildContext
 * @param {boolean} isSvg Whether or not this element is an SVG node
 * @param {Array<import('../internal').PreactElement>} excessDomChildren
 * @param {Array<import('../internal').Component>} commitQueue List of components
 * which have callbacks to invoke in commitRoot
 * @param {import('../internal').PreactElement} startDom
 * @param {boolean} [isHydrating] Whether or not we are in hydration
 * @returns {import('../internal').PreactElement | null} pointer to the next DOM node to be hydrated (or null)
 */
export function mount(
	parentDom,
	newVNode,
	globalContext,
	isSvg,
	excessDomChildren,
	commitQueue,
	startDom,
	isHydrating
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
				null,
				globalContext,
				isSvg,
				commitQueue,
				startDom,
				excessDomChildren,
				isHydrating
			);
		} else {
			newVNode._dom = mountDOMElement(
				null,
				newVNode,
				globalContext,
				isSvg,
				excessDomChildren,
				commitQueue,
				isHydrating
			);

			// @ts-ignore Trust me TS, nextSibling is a PreactElement
			nextDomSibling = newVNode._dom.nextSibling;
		}

		if ((tmp = options.diffed)) tmp(newVNode);

		// We successfully rendered this VNode, unset any stored hydration/bailout state:
		newVNode._hydrating = null;
	} catch (e) {
		newVNode._original = null;
		// if hydrating or creating initial tree, bailout preserves DOM:
		if (isHydrating || excessDomChildren != null) {
			// @ts-ignore Trust me TS, nextSibling is a PreactElement
			nextDomSibling = startDom && startDom.nextSibling;
			newVNode._dom = startDom;

			// _hydrating = true if bailed out during hydration
			// _hydrating = false if bailed out during mounting
			// _hydrating = null if it didn't bail out
			newVNode._hydrating = !!isHydrating;
			excessDomChildren[excessDomChildren.indexOf(startDom)] = null;
			// ^ could possibly be simplified to:
			// excessDomChildren.length = 0;
		}
		options._catchError(e, newVNode, newVNode);
	}

	return nextDomSibling;
}

/**
 * Diff two virtual nodes representing DOM element
 * @param {import('../internal').PreactElement} dom The DOM element representing
 * the virtual nodes being diffed
 * @param {import('../internal').VNode} newVNode The new virtual node
 * @param {object} globalContext The current context object
 * @param {boolean} isSvg Whether or not this DOM node is an SVG node
 * @param {*} excessDomChildren
 * @param {Array<import('../internal').Component>} commitQueue List of components
 * which have callbacks to invoke in commitRoot
 * @param {boolean} isHydrating Whether or not we are in hydration
 * @returns {import('../internal').PreactElement}
 */
function mountDOMElement(
	dom,
	newVNode,
	globalContext,
	isSvg,
	excessDomChildren,
	commitQueue,
	isHydrating
) {
	let i;
	let newProps = newVNode.props;

	if (excessDomChildren != null) {
		for (i = 0; i < excessDomChildren.length; i++) {
			const child = excessDomChildren[i];

			// if newVNode matches an element in excessDomChildren or the `dom`
			// argument matches an element in excessDomChildren, remove it from
			// excessDomChildren so it isn't later removed in diffChildren
			if (
				child != null &&
				((newVNode.type === null
					? child.nodeType === 3
					: child.localName === newVNode.type) ||
					dom == child)
			) {
				dom = child;
				excessDomChildren[i] = null;
				break;
			}
		}
	}

	if (newVNode.type == null) {
		if (dom == null) {
			// @ts-ignore createTextNode returns Text, we expect PreactElement
			dom = document.createTextNode(newProps);
		} else if (dom.data !== newProps) {
			dom.data = newProps;
		}
	} else {
		// Tracks entering and exiting SVG namespace when descending through the tree.
		isSvg = newVNode.type === 'svg' || isSvg;

		if (dom == null) {
			if (isSvg) {
				dom = document.createElementNS(
					'http://www.w3.org/2000/svg',
					// @ts-ignore We know `newVNode.type` is a string
					newVNode.type
				);
			} else {
				dom = document.createElement(
					// @ts-ignore We know `newVNode.type` is a string
					newVNode.type,
					newProps.is && { is: newProps.is }
				);
			}

			// we created a new parent, so none of the previously attached children can be reused:
			excessDomChildren = null;
			// we are creating a new node, so we can assume this is a new subtree (in case we are hydrating), this deopts the hydrate
			isHydrating = false;
		}

		// @TODO: Consider removing and instructing users to instead set the desired
		// prop for removal to undefined/null. During hydration, props are not
		// diffed at all (including dangerouslySetInnerHTML)
		if (!isHydrating && excessDomChildren != null) {
			// But, if we are in a situation where we are using existing DOM (e.g. replaceNode)
			// we should read the existing DOM attributes to diff them
			for (let i = 0; i < dom.attributes.length; i++) {
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

		// If the new vnode didn't have dangerouslySetInnerHTML, diff its children
		if (newHtml) {
			if (!isHydrating && newHtml.__html) {
				dom.innerHTML = newHtml.__html;
			}
			newVNode._children = [];
		} else {
			i = newVNode.props.children;

			if (excessDomChildren != null) {
				excessDomChildren = EMPTY_ARR.slice.call(dom.childNodes);
			}

			mountChildren(
				dom,
				Array.isArray(i) ? i : [i],
				newVNode,
				globalContext,
				newVNode.type === 'foreignObject' ? false : isSvg,
				excessDomChildren,
				commitQueue,
				excessDomChildren != null && excessDomChildren.length > 0
					? excessDomChildren[0]
					: null,
				isHydrating
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

	return dom;
}

/**
 * Diff the children of a virtual node
 * @param {import('../internal').PreactElement} parentDom The DOM element whose
 * children are being diffed
 * @param {import('../internal').ComponentChildren[]} renderResult
 * @param {import('../internal').VNode} newParentVNode The new virtual
 * node whose children should be diff'ed against oldParentVNode
 * @param {object} globalContext The current context object - modified by getChildContext
 * @param {boolean} isSvg Whether or not this DOM node is an SVG node
 * @param {Array<import('../internal').PreactElement>} excessDomChildren
 * @param {Array<import('../internal').Component>} commitQueue List of components
 * which have callbacks to invoke in commitRoot
 * @param {import('../internal').PreactElement} startDom
 * @param {boolean} isHydrating Whether or not we are in hydration
 */
export function mountChildren(
	parentDom,
	renderResult,
	newParentVNode,
	globalContext,
	isSvg,
	excessDomChildren,
	commitQueue,
	startDom,
	isHydrating
) {
	let i, childVNode, newDom, firstChildDom, mountedNextChild;

	newParentVNode._children = [];
	for (i = 0; i < renderResult.length; i++) {
		childVNode = newParentVNode._children[i] = normalizeToVNode(
			renderResult[i]
		);

		// Terser removes the `continue` here and wraps the loop body
		// in a `if (childVNode) { ... } condition
		if (childVNode == null) {
			continue;
		}

		childVNode._parent = newParentVNode;
		childVNode._depth = newParentVNode._depth + 1;

		// Morph the old element into the new one, but don't append it to the dom yet
		mountedNextChild = mount(
			parentDom,
			childVNode,
			globalContext,
			isSvg,
			excessDomChildren,
			commitQueue,
			startDom,
			isHydrating
		);

		newDom = childVNode._dom;

		if (newDom != null) {
			if (firstChildDom == null) {
				firstChildDom = newDom;
			}

			if (typeof childVNode.type === 'function' || newDom == startDom) {
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

		if (childVNode.ref) {
			applyRef(childVNode.ref, childVNode._component || newDom, childVNode);
		}
	}

	newParentVNode._dom = firstChildDom;

	// Remove children that are not part of any vnode.
	if (excessDomChildren != null && typeof newParentVNode.type != 'function') {
		for (i = excessDomChildren.length; i--; ) {
			if (excessDomChildren[i] != null) removeNode(excessDomChildren[i]);
		}
	}

	return startDom;
}
