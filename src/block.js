import { createVNode, Fragment } from './create-element';
import { diff } from './diff/index';
import { setProperty } from './diff/props';
import { getDomSibling } from './component';
import { EMPTY_OBJ, NULL, UNDEFINED } from './constants';
import { isArray } from './util';

/** Sentinel symbol for prop slot markers in VNode props */
const PROP_SLOT = Symbol.for('preact.propSlot');

/**
 * Create a block definition. A block collapses a static VNode tree into a
 * single unit that only diffs its dynamic slots on re-render.
 *
 * @param {(slot: (index: number) => any, prop: (index: number) => any) => import('./internal').VNode} renderFn
 * @returns {(...exprs: any[]) => import('./internal').VNode}
 */
export function block(renderFn) {
	const blockDef = { _render: renderFn, _propSlotPaths: NULL };

	return function () {
		const exprs =
			arguments.length === 1
				? [arguments[0]]
				: Array.prototype.slice.call(arguments);
		return createVNode(blockDef, exprs, NULL, NULL, NULL);
	};
}

/**
 * Walk a VNode tree to find prop slot sentinels, replace them with actual
 * values, and record tree paths. Called only on the first mount of a block
 * definition — subsequent mounts use the cached paths.
 *
 * @param {import('./internal').VNode} vnode
 * @param {any[]} exprs
 * @param {Array<{vnode: import('./internal').VNode, prop: string} | null>} propSlots
 * @param {Array<{path: number[], prop: string} | null>} propSlotPaths
 * @param {number[]} path
 */
function resolvePropSentinels(vnode, exprs, propSlots, propSlotPaths, path) {
	if (!vnode || typeof vnode != 'object' || vnode.constructor !== UNDEFINED)
		return;

	const props = vnode.props;
	if (!props) return;

	for (let key in props) {
		if (key === 'children') continue;
		const val = props[key];
		if (val && typeof val == 'object' && PROP_SLOT in val) {
			const idx = val[PROP_SLOT];
			propSlots[idx] = { vnode, prop: key };
			propSlotPaths[idx] = { path: path.slice(), prop: key };
			props[key] = exprs[idx];
		}
	}

	// Recurse into children
	const ch = props.children;
	if (isArray(ch)) {
		for (let i = 0; i < ch.length; i++) {
			path.push(i);
			resolvePropSentinels(ch[i], exprs, propSlots, propSlotPaths, path);
			path.pop();
		}
	} else {
		path.push(0);
		resolvePropSentinels(ch, exprs, propSlots, propSlotPaths, path);
		path.pop();
	}
}

/**
 * Navigate a diffed VNode tree to find a VNode at a given path.
 * @param {import('./internal').VNode} tree
 * @param {number[]} path
 * @returns {import('./internal').VNode}
 */
function resolveVNodeAtPath(tree, path) {
	let node = tree;
	for (let i = 0; i < path.length; i++) {
		node = node._children[path[i]];
	}
	return node;
}

/**
 * Diff a block VNode.
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
		// MOUNT
		const isFirstMount = !blockDef._propSlotPaths;
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

		// On first mount: use sentinels to discover prop slot positions.
		// On subsequent mounts: pass raw values (cached paths used after diff).
		const propFn = isFirstMount ? i => ({ [PROP_SLOT]: i }) : i => newExprs[i];

		const tree = blockDef._render(slotFn, propFn);

		let propSlots;

		if (isFirstMount) {
			// First mount: walk to discover prop slot positions
			propSlots = [];
			const propSlotPaths = [];
			resolvePropSentinels(tree, newExprs, propSlots, propSlotPaths, []);
			blockDef._propSlotPaths = propSlotPaths;

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

			// Resolve VNode refs to DOM
			for (let i = 0; i < propSlots.length; i++) {
				if (propSlots[i]) propSlots[i].dom = propSlots[i].vnode._dom;
			}
		} else {
			// Subsequent mounts: no sentinels, no walk
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

			// Resolve prop slots from cached paths
			propSlots = [];
			const paths = blockDef._propSlotPaths;
			for (let i = 0; i < paths.length; i++) {
				if (paths[i]) {
					const vnode = resolveVNodeAtPath(tree, paths[i].path);
					propSlots[i] = { dom: vnode._dom, prop: paths[i].prop };
				}
			}
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
				// Unchanged: carry forward
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
				// Content slot: create new Fragment and diff against old
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
