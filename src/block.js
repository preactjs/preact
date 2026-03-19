import { createVNode, Fragment } from './create-element';
import { diff } from './diff/index';
import { getDomSibling } from './component';
import { EMPTY_OBJ, NULL, UNDEFINED } from './constants';

/**
 * Create a block definition. A block collapses a static VNode tree into a
 * single unit that only diffs its dynamic slots on re-render. The render
 * function is called once on first render; subsequent renders only update
 * changed slot expressions.
 *
 * @param {(slot: (index: number) => import('./internal').VNode) => import('./internal').VNode} renderFn
 * @returns {(...exprs: any[]) => import('./internal').VNode}
 */
export function block(renderFn) {
	/** @type {{ _render: typeof renderFn }} */
	const blockDef = { _render: renderFn };

	return function () {
		const exprs =
			arguments.length === 1
				? [arguments[0]]
				: Array.prototype.slice.call(arguments);
		return createVNode(blockDef, exprs, NULL, NULL, NULL);
	};
}

/**
 * Diff a block VNode. On mount, calls the render function to create a full
 * VNode tree and diffs it normally. On re-render, only diffs changed slot
 * Fragments.
 *
 * @param {import('./internal').PreactElement} parentDom
 * @param {import('./internal').VNode} newVNode
 * @param {import('./internal').VNode} oldVNode
 * @param {object} globalContext
 * @param {string} namespace
 * @param {Array<import('./internal').PreactElement>} excessDomChildren
 * @param {Array<import('./internal').Component>} commitQueue
 * @param {import('./internal').PreactElement} oldDom
 * @param {boolean} isHydrating
 * @param {any[]} refQueue
 * @param {Document} doc
 * @returns {import('./internal').PreactElement}
 */
export function diffBlock(
	parentDom,
	newVNode,
	oldVNode,
	globalContext,
	namespace,
	excessDomChildren,
	commitQueue,
	oldDom,
	isHydrating,
	refQueue,
	doc
) {
	const blockDef = newVNode.type;
	const newExprs = newVNode.props;

	if (oldVNode._dom == NULL || oldVNode.type !== blockDef) {
		// MOUNT: call render function, diff the full tree
		const slotFragments = [];

		const slotFn = i => {
			const frag = createVNode(
				Fragment,
				{ children: newExprs[i] },
				NULL,
				NULL,
				NULL
			);
			slotFragments[i] = frag;
			return frag;
		};

		const tree = blockDef._render(slotFn);

		oldDom = diff(
			parentDom,
			tree,
			oldVNode._dom != NULL ? oldVNode : EMPTY_OBJ,
			globalContext,
			namespace,
			excessDomChildren,
			commitQueue,
			oldDom,
			isHydrating,
			refQueue,
			doc
		);

		newVNode._dom = tree._dom;
		newVNode._children = slotFragments;

		for (let i = 0; i < slotFragments.length; i++) {
			if (slotFragments[i]) slotFragments[i]._parent = newVNode;
		}
	} else {
		// UPDATE: only diff changed slots
		const oldExprs = oldVNode.props;
		const oldSlots = oldVNode._children;
		const newSlots = new Array(newExprs.length);

		for (let i = 0; i < newExprs.length; i++) {
			const oldSlotFrag = oldSlots[i];

			if (newExprs[i] === oldExprs[i]) {
				// Unchanged slot: carry forward
				newSlots[i] = oldSlotFrag;
				if (oldSlotFrag) oldSlotFrag._parent = newVNode;
			} else {
				// Changed slot: create new Fragment and diff
				const newSlotFrag = createVNode(
					Fragment,
					{ children: newExprs[i] },
					NULL,
					NULL,
					NULL
				);

				diff(
					oldSlotFrag._component._parentDom,
					newSlotFrag,
					oldSlotFrag,
					globalContext,
					namespace,
					NULL,
					commitQueue,
					getDomSibling(oldSlotFrag, 0),
					false,
					refQueue,
					doc
				);

				newSlotFrag._parent = newVNode;
				newSlots[i] = newSlotFrag;
			}
		}

		newVNode._dom = oldVNode._dom;
		newVNode._children = newSlots;
		oldDom = oldVNode._dom;
	}

	return oldDom;
}
