import { MODE_HYDRATE, MODE_NONE } from '../constants';
import options from '../options';
import { removeNode } from '../util';
import { applyRef } from './refs';
import { mountDOMElement } from './mount';
import { commitComponent } from './component';

/**
 * @param {import('../internal').PreactElement} parentDom The DOM element whose
 * children are being diffed
 * @param {import('../internal').VNode} newVNode
 * @param {boolean} isSvg Whether or not this DOM node is an SVG node
 * @param {Array<import('../internal').Component>} commitQueue List of components
 * which have callbacks to invoke in commitRoot
 * @param {import('../internal').PreactElement} startDom
 */
export function commitVNode(parentDom, newVNode, isSvg, commitQueue, startDom) {
	let oldVNode;
	/** @type {import('../internal').PreactElement} */
	let nextDomSibling;

	try {
		if (typeof newVNode.type === 'function') {
			const c = newVNode._component;
			c._parentDom = parentDom;

			nextDomSibling = commitChildren(
				parentDom,
				newVNode,
				isSvg,
				commitQueue,
				startDom
			);

			commitComponent(
				c,
				newVNode,
				(c._processingException = c._pendingError),
				commitQueue
			);
			// TODO
		} else if (oldVNode) {
			// TODO
		} else {
			newVNode._dom = mountDOMElement(startDom, newVNode, isSvg, commitQueue);

			// @ts-ignore Trust me TS, nextSibling is a PreactElement
			nextDomSibling = newVNode._dom.nextSibling;
		}

		// We successfully rendered this VNode, unset any stored hydration/bailout state:
		// TODO: Replace _hydrating with _mode
		newVNode._hydrating = null;
		newVNode._mode = MODE_NONE;
	} catch (e) {
		newVNode._original = null;
		// if hydrating or creating initial tree, bailout preserves DOM:

		// TODO: include replaceNode using MODE_MUTATIVE_HYDRATE, or could we just
		// not allow this during MUTATIVE_HYDRATE?
		if (newVNode._mode === MODE_HYDRATE) {
			// @ts-ignore Trust me TS, nextSibling is a PreactElement
			nextDomSibling = startDom && startDom.nextSibling;
			newVNode._dom = startDom;

			// _hydrating = true if bailed out during hydration
			// _hydrating = false if bailed out during mounting
			// _hydrating = null if it didn't bail out

			// TODO: Is always true unless we change the above condition to allow this
			// code path in MUTATIVE_HYDRATE
			newVNode._hydrating = newVNode._mode === MODE_HYDRATE;

			// excessDomChildren[excessDomChildren.indexOf(startDom)] = null;
			// ^ could possibly be simplified to:
			// excessDomChildren.length = 0;
		}
		options._catchError(e, newVNode, newVNode);
	}

	return nextDomSibling;
}

/**
 * @param {import('../internal').PreactElement} parentDom The DOM element whose
 * children are being diffed
 * @param {import('../internal').VNode} newParentVNode
 * @param {boolean} isSvg Whether or not this DOM node is an SVG node
 * @param {Array<import('../internal').Component>} commitQueue List of components
 * which have callbacks to invoke in commitRoot
 * @param {import('../internal').PreactElement} startDom
 */
export function commitChildren(
	parentDom,
	newParentVNode,
	isSvg,
	commitQueue,
	startDom
) {
	let i, childVNode, newDom, firstChildDom, mountedNextChild;

	// TODO: bitwise MODE_HYDRATE|MODE_MUTATIVE_HYDRATE
	if (
		newParentVNode._mode !== MODE_NONE &&
		typeof newParentVNode.type !== 'function'
	) {
		startDom = parentDom.childNodes[0];
	}

	const children = newParentVNode._children || [];
	for (i = 0; i < children.length; i++) {
		childVNode = children[i];

		if (childVNode == null) {
			continue;
		}

		mountedNextChild = commitVNode(
			parentDom,
			childVNode,
			isSvg,
			commitQueue,
			startDom
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
	// TODO: bitwise MODE_HYDRATE|MODE_MUTATIVE_HYDRATE
	if (
		newParentVNode._mode !== MODE_NONE &&
		typeof newParentVNode.type !== 'function'
	) {
		// TODO: Would it be simpler to just clear the pre-existing DOM in top-level
		// render if render is called with no oldVNode & existing children & no
		// replaceNode? Instead of patching the DOM to match the VNode tree? (remove
		// attributes & unused DOM)
		while (startDom) {
			i = startDom;
			startDom = startDom.nextSibling;
			removeNode(i);
		}
	}

	return startDom;
}

/**
 * @param {Array<import('../internal').Component>} commitQueue List of components
 * which have callbacks to invoke in commitRoot
 * @param {import('../internal').VNode} root
 * @param {import('../internal').PreactElement} parentDom
 * @param {import('../internal').PreactElement} startDom
 */
export function commitRoot(commitQueue, root, parentDom, startDom) {
	commitChildren(
		parentDom,
		root,
		parentDom.ownerSVGElement !== undefined,
		commitQueue,
		startDom
	);

	if (options._commit) options._commit(root, commitQueue);

	commitQueue.some(c => {
		try {
			// @ts-ignore Reuse the commitQueue variable here so the type changes
			commitQueue = c._renderCallbacks;
			c._renderCallbacks = [];
			commitQueue.some(cb => {
				// @ts-ignore See above ts-ignore on commitQueue
				cb.call(c);
			});
		} catch (e) {
			options._catchError(e, c._vnode);
		}
	});
}
