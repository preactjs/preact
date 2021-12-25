import { runHook } from '../options';
import { EMPTY_ARR, EMPTY_OBJ } from '../constants';
import { getChildNewVNode, getChildOldVNode, addChildRef, updateChildDom, removeOldChildren, applyChildRefs } from './children';
import {
	diffable,
	recoverErrorDiff,
	diffComponentNodes,
	saveComponentDiff,
	noDiff,
	equalizeNodes,
	handleDiffError,
	getElementNodeProps,
	updateElementNodeHtml,
	updateElementNode,
	removeElementNodeChildren
} from './index';
import { slice } from '../util';
import { diffProps } from './props';
import { getDomSibling } from '../component';

/**
 * Diff two virtual nodes and apply proper changes to the DOM - async version
 */
export async function diffAsync(
	parentDom,
	newVNode,
	oldVNode,
	globalContext,
	isSvg,
	excessDomChildren,
	commitQueue,
	oldDom,
	isHydrating
) {

	// for async rendering, if we're running out of deadline, yield and get back as browser allows us
	if (typeof window !== 'undefined' && (!window._preactDeadline || Date.now() > window._preactDeadline))
		await new Promise(resolve => requestIdleCallback(deadline => { window._preactDeadline = Date.now() + deadline.timeRemaining(); resolve(); }));

	if (!diffable(newVNode)) return null;

	const { recover, update } = recoverErrorDiff(newVNode, oldVNode, excessDomChildren, oldDom, isHydrating);
	if (recover) { isHydrating = update.isHydrating; excessDomChildren = update.excessDomChildren; oldDom = update.oldDom; }

	runHook('_diff', newVNode);

	try {
		if (typeof newVNode.type == 'function') {

			let { commitPushed, renderResult, c, clearProcessingException, newGlobalContext } = diffComponentNodes(
				parentDom,
				newVNode,
				oldVNode,
				globalContext,
				isSvg,
				excessDomChildren,
				commitQueue
			);

			if (!commitPushed) {
				globalContext = newGlobalContext;
				await diffChildrenAsync(
					parentDom,
					Array.isArray(renderResult) ? renderResult : [renderResult],
					newVNode,
					oldVNode,
					globalContext,
					isSvg,
					excessDomChildren,
					commitQueue,
					oldDom,
					isHydrating
				);
				saveComponentDiff(c, newVNode, clearProcessingException, commitQueue);
			}
		} else if (noDiff(newVNode, oldVNode, excessDomChildren)) {
			equalizeNodes(newVNode, oldVNode);
		} else {
			await diffElementNodesAsync(
				oldVNode._dom,
				newVNode,
				oldVNode,
				globalContext,
				isSvg,
				excessDomChildren,
				commitQueue,
				isHydrating
			);
		}

		runHook('diffed', newVNode);
	} catch (e) {
		handleDiffError(e, newVNode, oldVNode, excessDomChildren, oldDom, isHydrating);
	}
}

/**
 * Diff the children of a virtual node - async version
 */
async function diffChildrenAsync(
	parentDom,
	renderResult,
	newParentVNode,
	oldParentVNode,
	globalContext,
	isSvg,
	excessDomChildren,
	commitQueue,
	oldDom,
	isHydrating
) {
	let i, oldVNode, childVNode, firstChildDom, refs;

	// This is a compression of oldParentVNode!=null && oldParentVNode != EMPTY_OBJ && oldParentVNode._children || EMPTY_ARR
	// as EMPTY_OBJ._children should be `undefined`.
	let oldChildren = (oldParentVNode && oldParentVNode._children) || EMPTY_ARR;

	newParentVNode._children = [];
	for (i = 0; i < renderResult.length; i++) {

		childVNode = getChildNewVNode(renderResult[i], newParentVNode, i);
		if (!childVNode) continue;

		oldVNode = getChildOldVNode(childVNode, oldChildren, i);

		// Morph the old element into the new one, but don't append it to the dom yet
		await diffAsync(
			parentDom,
			childVNode,
			oldVNode,
			globalContext,
			isSvg,
			excessDomChildren,
			commitQueue,
			oldDom,
			isHydrating
		);

		if (childVNode._dom && !firstChildDom) firstChildDom = childVNode._dom;

		if (oldVNode.ref != childVNode.ref) {
			if (!refs) refs = [];
			addChildRef(refs, childVNode, oldVNode);
		}

		oldDom = updateChildDom(parentDom, newParentVNode, oldChildren, childVNode, childVNode._dom, oldVNode, oldDom);
	}

	newParentVNode._dom = firstChildDom;

	removeOldChildren(oldChildren, oldParentVNode, newParentVNode);

	applyChildRefs(refs);
}

/**
 * Diff two virtual nodes representing DOM element - async version
 * TODO: this should probably be refactored to increase code re-use - a lot of replicated code
 */
async function diffElementNodesAsync(
	dom,
	newVNode,
	oldVNode,
	globalContext,
	isSvg,
	excessDomChildren,
	commitQueue,
	isHydrating
) {
	let oldProps = oldVNode.props;
	let newProps = newVNode.props;
	let nodeType = newVNode.type;
	let i = 0;

	// Tracks entering and exiting SVG namespace when descending through the tree.
	if (nodeType === 'svg') isSvg = true;

	if (excessDomChildren != null) {
		for (; i < excessDomChildren.length; i++) {
			const child = excessDomChildren[i];

			// if newVNode matches an element in excessDomChildren or the `dom`
			// argument matches an element in excessDomChildren, remove it from
			// excessDomChildren so it isn't later removed in diffChildren
			if (
				child &&
				'setAttribute' in child === !!nodeType &&
				(nodeType ? child.localName === nodeType : child.nodeType === 3)
			) {
				dom = child;
				excessDomChildren[i] = null;
				break;
			}
		}
	}

	if (dom == null) {
		if (nodeType === null) {
			// @ts-ignore createTextNode returns Text, we expect PreactElement
			newVNode._dom = document.createTextNode(newProps); return;
		}

		if (isSvg) {
			dom = document.createElementNS(
				'http://www.w3.org/2000/svg',
				// @ts-ignore We know `newVNode.type` is a string
				nodeType
			);
		} else {
			dom = document.createElement(
				// @ts-ignore We know `newVNode.type` is a string
				nodeType,
				newProps.is && newProps
			);
		}

		// we created a new parent, so none of the previously attached children can be reused:
		excessDomChildren = null;
		// we are creating a new node, so we can assume this is a new subtree (in case we are hydrating), this deopts the hydrate
		isHydrating = false;
	}

	if (nodeType === null) {
		// During hydration, we still have to split merged text from SSR'd HTML.
		if (oldProps !== newProps && (!isHydrating || dom.data !== newProps)) {
			dom.data = newProps;
		}
		newVNode._dom = dom;
		return;
	}

	// If excessDomChildren was not null, repopulate it with the current element's children:
	excessDomChildren = excessDomChildren && slice.call(dom.childNodes);

	oldProps = oldVNode.props || EMPTY_OBJ;

	// During hydration, props are not diffed at all (including dangerouslySetInnerHTML)
	// @TODO we should warn in debug mode when props don't match here.
	if (!isHydrating) {
		// But, if we are in a situation where we are using existing DOM (e.g. replaceNode)
		// we should read the existing DOM attributes to diff them
		if (excessDomChildren != null) oldProps = getElementNodeProps(dom);

		updateElementNodeHtml(newProps.dangerouslySetInnerHTML, oldProps.dangerouslySetInnerHTML, dom);
	}

	diffProps(dom, newProps, oldProps, isSvg, isHydrating);

	// If the new vnode didn't have dangerouslySetInnerHTML, diff its children
	if (newProps.dangerouslySetInnerHTML) {
		newVNode._children = [];
		updateElementNode(newProps, oldProps, dom, nodeType, isHydrating);
		newVNode._dom = dom;
		return;
	}

	i = newVNode.props.children;
	await diffChildrenAsync(
		dom,
		Array.isArray(i) ? i : [i],
		newVNode,
		oldVNode,
		globalContext,
		isSvg && nodeType !== 'foreignObject',
		excessDomChildren,
		commitQueue,
		excessDomChildren
			? excessDomChildren[0]
			: oldVNode._children && getDomSibling(oldVNode, 0),
		isHydrating
	);

	removeElementNodeChildren(excessDomChildren);

	updateElementNode(newProps, oldProps, dom, nodeType, isHydrating);

	newVNode._dom = dom;
}
