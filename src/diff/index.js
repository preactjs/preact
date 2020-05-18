import { EMPTY_OBJ, EMPTY_ARR } from '../constants';
import { Component } from '../component';
import { Fragment } from '../create-element';
import { diffChildren, selectOldDom } from './children';
import { diffProps, setProperty } from './props';
import { assign, removeNode } from '../util';
import options from '../options';
import { logArgsShapeChange, logShapeChange } from '../logShapeChange';
import { diffComponentNode } from './diffComponentNode';

/**
 * @typedef {{ oldDom: Element | Text; }} DiffData
 * @param {Element | Text} oldDom
 */
export function createDiffData(oldDom) {
	// const data = { oldDom: null };
	// data.oldDom = oldDom;
	// logShapeChange('diffData', data);
	// if (oldDom === undefined) {
	// 	throw new Error('whaaaattt');
	// }
	// return data;

	return { oldDom };
}

/**
 * Diff two virtual nodes and apply proper changes to the DOM
 * @param {import('../internal').PreactElement} parentDom The parent of the DOM element
 * @param {import('../internal').VNode} newVNode The new virtual node
 * @param {import('../internal').VNode} oldVNode The old virtual node
 * @param {object} globalContext The current context object. Modified by getChildContext
 * @param {boolean} isSvg Whether or not this element is an SVG node
 * @param {Array<import('../internal').PreactElement>} excessDomChildren
 * @param {Array<import('../internal').Component>} commitQueue List of components
 * which have callbacks to invoke in commitRoot
 * @param {DiffData} diffData The current attached DOM
 * element any new dom elements should be placed around. Likely `null` on first
 * render (except when hydrating). Can be a sibling DOM element when diffing
 * Fragments that have siblings. In most cases, it starts out as `oldChildren[0]._dom`.
 * @param {boolean} [isHydrating] Whether or not we are in hydration
 */
export function diff(
	parentDom,
	newVNode,
	oldVNode,
	globalContext,
	isSvg,
	excessDomChildren,
	commitQueue,
	diffData,
	isHydrating
) {
	// const newType = newVNode.type;

	// When passing through createElement it assigns the object
	// constructor as undefined. This to prevent JSON-injection.
	if (newVNode.constructor !== undefined) return null;

	// if ((tmp = options._diff)) tmp(newVNode);

	// try {
	if (typeof newVNode.type == 'function') {
		diffComponentNode(
			parentDom,
			newVNode,
			oldVNode,
			globalContext,
			isSvg,
			excessDomChildren,
			commitQueue,
			diffData,
			isHydrating
		);
	} else if (
		excessDomChildren == null &&
		newVNode._original === oldVNode._original
	) {
		newVNode._children = oldVNode._children;
		newVNode._dom = oldVNode._dom;
	} else {
		newVNode._dom = diffElementNodes(
			// oldVNode._dom,
			newVNode,
			oldVNode,
			globalContext,
			isSvg,
			excessDomChildren,
			commitQueue,
			isHydrating
		);
	}

	// if ((tmp = options.diffed)) tmp(newVNode);
	// } catch (e) {
	// 	newVNode._original = null;
	// 	options._catchError(e, newVNode, oldVNode);
	// }

	return newVNode._dom;
}

/**
 * @param {Array<import('../internal').Component>} commitQueue List of components
 * which have callbacks to invoke in commitRoot
 * @param {import('../internal').VNode} root
 */
export function commitRoot(commitQueue, root) {
	if (options._commit) options._commit(root, commitQueue);

	commitQueue.some(c => {
		// try {
		commitQueue = c._renderCallbacks;
		c._renderCallbacks = [];
		commitQueue.some(cb => {
			cb.call(c);
		});
		// } catch (e) {
		// 	options._catchError(e, c._vnode);
		// }
	});
}

/**
 * Diff two virtual nodes representing DOM element
 * @param {import('../internal').PreactElement} dom The DOM element representing
 * the virtual nodes being diffed
 * @param {import('../internal').VNode} newVNode The new virtual node
 * @param {import('../internal').VNode} oldVNode The old virtual node
 * @param {object} globalContext The current context object
 * @param {boolean} isSvg Whether or not this DOM node is an SVG node
 * @param {*} excessDomChildren
 * @param {Array<import('../internal').Component>} commitQueue List of components
 * which have callbacks to invoke in commitRoot
 * @param {boolean} isHydrating Whether or not we are in hydration
 * @returns {import('../internal').PreactElement}
 */
function diffElementNodes(
	// dom,
	newVNode,
	oldVNode,
	globalContext,
	isSvg,
	excessDomChildren,
	commitQueue,
	isHydrating
) {
	let i;
	let dom = oldVNode._dom;
	let oldProps = oldVNode.props;
	let newProps = newVNode.props;

	// Tracks entering and exiting SVG namespace when descending through the tree.
	isSvg = newVNode.type === 'svg' || isSvg;

	// if (excessDomChildren != null) {
	// 	for (i = 0; i < excessDomChildren.length; i++) {
	// 		const child = excessDomChildren[i];

	// 		// if newVNode matches an element in excessDomChildren or the `dom`
	// 		// argument matches an element in excessDomChildren, remove it from
	// 		// excessDomChildren so it isn't later removed in diffChildren
	// 		if (
	// 			child != null &&
	// 			((newVNode.type === null
	// 				? child.nodeType === 3
	// 				: child.localName === newVNode.type) ||
	// 				dom == child)
	// 		) {
	// 			dom = child;
	// 			excessDomChildren[i] = null;
	// 			break;
	// 		}
	// 	}
	// }

	if (dom == null) {
		if (newVNode.type === null) {
			return document.createTextNode(newProps);
		}

		dom = isSvg
			? document.createElementNS('http://www.w3.org/2000/svg', newVNode.type)
			: document.createElement(
					newVNode.type,
					newProps.is && { is: newProps.is }
			  );
		// we created a new parent, so none of the previously attached children can be reused:
		excessDomChildren = null;
		// we are creating a new node, so we can assume this is a new subtree (in case we are hydrating), this deopts the hydrate
		isHydrating = false;
	}

	if (newVNode.type === null) {
		if (oldProps !== newProps && dom.data != newProps) {
			dom.data = newProps;
		}
	} else {
		// if (excessDomChildren != null) {
		// 	excessDomChildren = EMPTY_ARR.slice.call(dom.childNodes);
		// }

		// oldProps = oldVNode.props || EMPTY_OBJ;

		// let oldHtml = oldProps.dangerouslySetInnerHTML;
		// let newHtml = newProps.dangerouslySetInnerHTML;

		// During hydration, props are not diffed at all (including dangerouslySetInnerHTML)
		// @TODO we should warn in debug mode when props don't match here.
		// if (!isHydrating) {
		// 	// But, if we are in a situation where we are using existing DOM (e.g. replaceNode)
		// 	// we should read the existing DOM attributes to diff them
		// 	if (excessDomChildren != null) {
		// 		oldProps = {};
		// 		for (let i = 0; i < dom.attributes.length; i++) {
		// 			oldProps[dom.attributes[i].name] = dom.attributes[i].value;
		// 		}
		// 	}

		// 	if (newHtml || oldHtml) {
		// 		// Avoid re-applying the same '__html' if it did not changed between re-render
		// 		if (!newHtml || !oldHtml || newHtml.__html != oldHtml.__html) {
		// 			dom.innerHTML = (newHtml && newHtml.__html) || '';
		// 		}
		// 	}
		// }

		diffProps(dom, newProps, oldProps, isSvg, isHydrating);

		// If the new vnode didn't have dangerouslySetInnerHTML, diff its children
		// if (newHtml) {
		// 	newVNode._children = [];
		// } else {
		i = newVNode.props.children;
		diffChildren(
			// ...logArgsShapeChange(
			// 	'diffChildren',
			dom,
			Array.isArray(i) ? i : [i],
			newVNode,
			oldVNode,
			globalContext,
			newVNode.type === 'foreignObject' ? false : isSvg,
			excessDomChildren,
			commitQueue,
			createDiffData(selectOldDom(oldVNode, excessDomChildren)),
			isHydrating
			// )
		);
		// }

		// (as above, don't diff props during hydration)
		if (!isHydrating) {
			if (
				'value' in newProps &&
				(i = newProps.value) !== undefined &&
				i !== dom.value
			) {
				setProperty(dom, 'value', i, oldProps && oldProps.value, false);
			}
			if (
				'checked' in newProps &&
				(i = newProps.checked) !== undefined &&
				i !== dom.checked
			) {
				setProperty(dom, 'checked', i, oldProps && oldProps.checked, false);
			}
		}
	}

	return dom;
}

/**
 * Invoke or update a ref, depending on whether it is a function or object ref.
 * @param {object|function} ref
 * @param {any} value
 * @param {import('../internal').VNode} vnode
 */
// export function applyRef(ref, value, vnode) {
// 	try {
// 		if (typeof ref == 'function') ref(value);
// 		else ref.current = value;
// 	} catch (e) {
// 		options._catchError(e, vnode);
// 	}
// }

/**
 * Unmount a virtual node from the tree and apply DOM changes
 * @param {import('../internal').VNode} vnode The virtual node to unmount
 * @param {import('../internal').VNode} parentVNode The parent of the VNode that
 * initiated the unmount
 * @param {boolean} [skipRemove] Flag that indicates that a parent node of the
 * current element is already detached from the DOM.
 */
export function unmount(vnode, parentVNode, skipRemove) {
	let r;
	if (options.unmount) options.unmount(vnode);

	// if ((r = vnode.ref)) {
	// 	if (!r.current || r.current === vnode._dom) applyRef(r, null, parentVNode);
	// }

	let dom;
	if (!skipRemove && typeof vnode.type != 'function') {
		skipRemove = (dom = vnode._dom) != null;
	}

	// Must be set to `undefined` to properly clean up `_nextDom`
	// for which `null` is a valid value. See comment in `create-element.js`
	vnode._dom = vnode._nextDom = undefined;

	if ((r = vnode._component) != null) {
		// if (r.componentWillUnmount) {
		// 	try {
		// 		r.componentWillUnmount();
		// 	} catch (e) {
		// 		options._catchError(e, parentVNode);
		// 	}
		// }

		r.base = r._parentDom = null;
	}

	if ((r = vnode._children)) {
		for (let i = 0; i < r.length; i++) {
			if (r[i]) unmount(r[i], parentVNode, skipRemove);
		}
	}

	if (dom != null) removeNode(dom);
}
