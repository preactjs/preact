import options from '../options';
import { diffChildren, getChildNewVNode, getChildOldVNode, addChildRef, updateChildDom, removeOldChildren, applyChildRefs } from './children';
import { diffable, recoverErrorDiff, diffComponentNodes, diffElementNodes, saveComponentDiff, noDiff, equalizeNodes, handleDiffError } from './index';
import { runHook } from '../options';
import { EMPTY_ARR } from 'preact/src/constants';

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
	if (options.asyncRendering && typeof window !== 'undefined' && (!window._preactDeadline || Date.now() > window._preactDeadline))
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
				await diffChildren(
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
			await diffElementNodes(
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
export async function diffChildren(
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

