import { createVNode, Fragment } from './create-element';
import { diff } from './diff/index';
import { setProperty } from './diff/props';
import { getDomSibling } from './component';
import { EMPTY_OBJ, NULL, UNDEFINED } from './constants';
import { isArray } from './util';

/** Sentinel symbol for prop slot markers */
const PROP_SLOT = Symbol.for('preact.propSlot');

/**
 * Create a block definition. A block collapses a static VNode tree into a
 * single unit that only diffs its dynamic slots on re-render. The render
 * function is called once on first render; subsequent renders only update
 * changed slot expressions.
 *
 * @param {(slot: (index: number) => import('./internal').VNode, prop: (index: number) => any) => import('./internal').VNode} renderFn
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
 * Walk a VNode tree to find prop slot sentinels, replace them with
 * actual values, and record the VNode + prop name for direct updates.
 * Runs once on mount, not on re-render.
 * @param {import('./internal').VNode} vnode
 * @param {any[]} exprs
 * @param {Array<{vnode: import('./internal').VNode, prop: string} | null>} propSlots
 */
function resolvePropSentinels(vnode, exprs, propSlots) {
	if (!vnode || typeof vnode != 'object' || vnode.constructor !== UNDEFINED)
		return;

	const props = vnode.props;
	if (props) {
		for (let key in props) {
			if (key === 'children') continue;
			const val = props[key];
			if (val && typeof val == 'object' && PROP_SLOT in val) {
				const idx = val[PROP_SLOT];
				propSlots[idx] = { vnode, prop: key };
				props[key] = exprs[idx];
			}
		}

		// Recurse into children
		const ch = props.children;
		if (isArray(ch)) {
			for (let i = 0; i < ch.length; i++)
				resolvePropSentinels(ch[i], exprs, propSlots);
		} else {
			resolvePropSentinels(ch, exprs, propSlots);
		}
	}
}

/**
 * Diff a block VNode. On mount, calls the render function to create a full
 * VNode tree and diffs it normally. On re-render, only diffs changed slot
 * Fragments and updates prop slots directly.
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
		const propSlots = [];

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

		const propFn = i => {
			return { [PROP_SLOT]: i };
		};

		const tree = blockDef._render(slotFn, propFn);

		// Walk tree to resolve prop sentinels before diffing
		resolvePropSentinels(tree, newExprs, propSlots);

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

		// Resolve VNode references to actual DOM elements
		for (let i = 0; i < propSlots.length; i++) {
			if (propSlots[i]) propSlots[i].dom = propSlots[i].vnode._dom;
		}

		newVNode._dom = tree._dom;
		newVNode._children = slotFragments;
		tree._dom._blockPropSlots = propSlots;

		for (let i = 0; i < slotFragments.length; i++) {
			if (slotFragments[i]) slotFragments[i]._parent = newVNode;
		}
	} else {
		// UPDATE: only diff changed slots
		const oldExprs = oldVNode.props;
		const oldSlots = oldVNode._children;
		const propSlots = oldVNode._dom._blockPropSlots;
		const newSlots = new Array(newExprs.length);

		for (let i = 0; i < newExprs.length; i++) {
			if (newExprs[i] === oldExprs[i]) {
				// Unchanged slot: carry forward
				newSlots[i] = oldSlots[i];
				if (oldSlots[i] && oldSlots[i]._parent) oldSlots[i]._parent = newVNode;
				continue;
			}

			if (propSlots[i]) {
				// Prop slot: direct DOM update via setProperty
				setProperty(
					propSlots[i].dom,
					propSlots[i].prop,
					newExprs[i],
					oldExprs[i],
					namespace
				);
			} else if (oldSlots[i]) {
				// Content slot: create new Fragment and diff
				const newSlotFrag = createVNode(
					Fragment,
					{ children: newExprs[i] },
					NULL,
					NULL,
					NULL
				);

				diff(
					oldSlots[i]._component._parentDom,
					newSlotFrag,
					oldSlots[i],
					globalContext,
					namespace,
					NULL,
					commitQueue,
					getDomSibling(oldSlots[i], 0),
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
