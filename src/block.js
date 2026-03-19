import { createVNode, Fragment } from './create-element';
import { diff } from './diff/index';
import { diffChildren } from './diff/children';
import { setProperty } from './diff/props';
import { getDomSibling } from './component';
import { EMPTY_OBJ, NULL, UNDEFINED } from './constants';
import { isArray } from './util';

/** Sentinel symbol for prop slot markers in VNode props */
const PROP_SLOT = Symbol.for('preact.propSlot');

/** Sentinel symbol for content slot markers in VNode children */
const CONTENT_SLOT = Symbol.for('preact.contentSlot');

/**
 * Create a block definition. A block collapses a static VNode tree into a
 * single unit that only diffs its dynamic slots on re-render.
 *
 * @param {(slot: (index: number) => any, prop: (index: number) => any) => import('./internal').VNode} renderFn
 * @returns {(...exprs: any[]) => import('./internal').VNode}
 */
export function block(renderFn) {
	const blockDef = {
		_render: renderFn,
		_propSlotPaths: NULL,
		_contentSlotPaths: NULL
	};

	return function () {
		const exprs =
			arguments.length === 1
				? [arguments[0]]
				: Array.prototype.slice.call(arguments);
		return createVNode(blockDef, exprs, NULL, NULL, NULL);
	};
}

/**
 * Wrap array expressions in Fragment VNodes for proper multi-child
 * management. Returns the expression as-is for non-arrays.
 */
function wrapSlotExpr(expr) {
	return isArray(expr)
		? createVNode(Fragment, { children: expr }, NULL, NULL, NULL)
		: expr;
}

/**
 * Walk a VNode tree to find prop and content slot sentinels. Replaces
 * sentinels with actual expression values and records tree paths.
 * Called only on the first mount of a block definition.
 */
function resolveSentinels(
	vnode,
	exprs,
	propSlots,
	propSlotPaths,
	contentSlotPaths,
	path
) {
	if (!vnode || typeof vnode != 'object' || vnode.constructor !== UNDEFINED)
		return;

	const props = vnode.props;
	if (!props) return;

	// Check props for prop slot sentinels
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

	// Check children for content slot sentinels, recurse into VNode children
	let ch = props.children;
	if (isArray(ch)) {
		for (let i = 0; i < ch.length; i++) {
			const child = ch[i];
			if (child && typeof child == 'object' && CONTENT_SLOT in child) {
				const idx = child[CONTENT_SLOT];
				contentSlotPaths[idx] = { path: path.slice(), childIdx: i };
				ch[i] = wrapSlotExpr(exprs[idx]);
			} else {
				path.push(i);
				resolveSentinels(
					child,
					exprs,
					propSlots,
					propSlotPaths,
					contentSlotPaths,
					path
				);
				path.pop();
			}
		}
	} else if (ch && typeof ch == 'object' && CONTENT_SLOT in ch) {
		const idx = ch[CONTENT_SLOT];
		contentSlotPaths[idx] = { path: path.slice(), childIdx: 0 };
		props.children = wrapSlotExpr(exprs[idx]);
	} else {
		path.push(0);
		resolveSentinels(
			ch,
			exprs,
			propSlots,
			propSlotPaths,
			contentSlotPaths,
			path
		);
		path.pop();
	}
}

/**
 * Navigate a diffed VNode tree to find a VNode at a given path.
 */
function resolveVNodeAtPath(tree, path) {
	let node = tree;
	for (let i = 0; i < path.length; i++) {
		node = node._children[path[i]];
	}
	return node;
}

/**
 * Collect child VNodes from content slots into a flat array for unmount.
 */
function collectChildVNodes(contentSlots, out) {
	for (let i = 0; i < contentSlots.length; i++) {
		if (contentSlots[i] && contentSlots[i].childVNode) {
			out.push(contentSlots[i].childVNode);
		}
	}
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

		// Content slots: sentinels on first mount, raw values (with array
		// wrapping) on subsequent mounts
		const slotFn = isFirstMount
			? i => ({ [CONTENT_SLOT]: i })
			: i => wrapSlotExpr(newExprs[i]);

		// Prop slots: sentinels on first mount, raw values on subsequent
		const propFn = isFirstMount ? i => ({ [PROP_SLOT]: i }) : i => newExprs[i];

		const tree = blockDef._render(slotFn, propFn);

		let propSlots, contentSlots;

		if (isFirstMount) {
			// First mount: discover slot positions via sentinel walk
			propSlots = [];
			const propSlotPaths = [];
			const contentSlotPaths = [];
			resolveSentinels(
				tree,
				newExprs,
				propSlots,
				propSlotPaths,
				contentSlotPaths,
				[]
			);
			blockDef._propSlotPaths = propSlotPaths;
			blockDef._contentSlotPaths = contentSlotPaths;

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

			// Resolve prop slots from discovered VNodes
			for (let i = 0; i < propSlots.length; i++) {
				if (propSlots[i]) propSlots[i].dom = propSlots[i].vnode._dom;
			}

			// Resolve content slots from discovered paths
			contentSlots = [];
			for (let i = 0; i < contentSlotPaths.length; i++) {
				const sp = contentSlotPaths[i];
				if (!sp) continue;
				const parentVNode = resolveVNodeAtPath(tree, sp.path);
				contentSlots[i] = {
					parentDom: parentVNode._dom,
					childVNode: parentVNode._children
						? parentVNode._children[sp.childIdx]
						: NULL
				};
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
			const pPaths = blockDef._propSlotPaths;
			for (let i = 0; i < pPaths.length; i++) {
				if (pPaths[i]) {
					const vnode = resolveVNodeAtPath(tree, pPaths[i].path);
					propSlots[i] = { dom: vnode._dom, prop: pPaths[i].prop };
				}
			}

			// Resolve content slots from cached paths
			contentSlots = [];
			const cPaths = blockDef._contentSlotPaths;
			for (let i = 0; i < cPaths.length; i++) {
				if (cPaths[i]) {
					const parentVNode = resolveVNodeAtPath(tree, cPaths[i].path);
					contentSlots[i] = {
						parentDom: parentVNode._dom,
						childVNode: parentVNode._children
							? parentVNode._children[cPaths[i].childIdx]
							: NULL
					};
				}
			}
		}

		newVNode._dom = tree._dom;
		tree._dom._blockPropSlots = propSlots;
		tree._dom._blockContentSlots = contentSlots;

		// _children: flat list of slot child VNodes for unmount traversal
		newVNode._children = [];
		collectChildVNodes(contentSlots, newVNode._children);
	} else {
		// UPDATE: only diff changed slots
		const oldExprs = oldVNode.props;
		const propSlots = oldVNode._dom._blockPropSlots;
		const contentSlots = oldVNode._dom._blockContentSlots;

		for (let i = 0; i < newExprs.length; i++) {
			if (newExprs[i] === oldExprs[i]) continue;

			if (propSlots[i]) {
				// Prop slot: direct DOM update
				setProperty(
					propSlots[i].dom,
					propSlots[i].prop,
					newExprs[i],
					oldExprs[i],
					namespace
				);
			} else if (contentSlots[i]) {
				const cs = contentSlots[i];
				const oldChild = cs.childVNode;
				const newExpr = newExprs[i];

				if (
					oldChild &&
					oldChild.type === NULL &&
					(typeof newExpr == 'string' ||
						typeof newExpr == 'number' ||
						typeof newExpr == 'bigint')
				) {
					// Fast path: text → text (no VNode allocation)
					oldChild._dom.data = newExpr;
					oldChild.props = newExpr;
				} else if (
					oldChild &&
					oldChild.type === Fragment &&
					oldChild._component
				) {
					// Array slot: diff new Fragment against old Fragment
					const newFrag = createVNode(
						Fragment,
						{ children: newExpr },
						NULL,
						NULL,
						NULL
					);
					diff(
						oldChild._component._parentDom,
						newFrag,
						oldChild,
						globalContext,
						namespace,
						NULL,
						commitQueue,
						getDomSibling(oldChild, 0),
						false,
						refQueue,
						doc
					);
					cs.childVNode = newFrag;
				} else {
					// General path: use diffChildren for proper reconciliation
					const oldParent = createVNode(NULL, NULL, NULL, NULL, NULL);
					oldParent._children = oldChild ? [oldChild] : [];

					const newParent = createVNode(NULL, NULL, NULL, NULL, NULL);

					diffChildren(
						cs.parentDom,
						[wrapSlotExpr(newExpr)],
						newParent,
						oldParent,
						globalContext,
						namespace,
						NULL,
						commitQueue,
						oldChild ? oldChild._dom : NULL,
						false,
						refQueue,
						doc
					);

					cs.childVNode = newParent._children ? newParent._children[0] : NULL;
				}
			}
		}

		newVNode._dom = oldVNode._dom;

		// Rebuild _children for unmount traversal
		newVNode._children = [];
		collectChildVNodes(contentSlots, newVNode._children);
	}

	return oldDom;
}
