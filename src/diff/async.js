import options from '../options';
import { diffChildren } from './children';
import { diffable, recoverBailedDiff, runHook, diffComponentNodes, diffElementNodes, saveComponentDiff, noDiff, equalizeNodes, handleDiffError } from './index';

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

	recoverBailedDiff(newVNode, oldVNode, excessDomChildren, oldDom, isHydrating);

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

