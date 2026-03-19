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
 * Create a block definition.
 *
 * Two forms:
 * 1. `block(renderFn)` — h()-based render function (runtime discovery)
 * 2. `block(html, descriptors)` — compiler-optimized template + cloneNode
 *
 * @param {string | Function} htmlOrRenderFn
 * @param {Array} [descriptors]
 * @returns {(...exprs: any[]) => import('./internal').VNode}
 */
export function block(htmlOrRenderFn, descriptors) {
	if (typeof htmlOrRenderFn === 'string') {
		return createTemplateBlock(htmlOrRenderFn, descriptors);
	}
	return createRenderBlock(htmlOrRenderFn);
}

// ─── Template-based block (compiler-optimized) ───────────────────────

/**
 * Create a template-based block. The compiler provides static HTML and
 * slot descriptors. Mount uses cloneNode, bypassing VNode creation and diff.
 */
function createTemplateBlock(html, descriptors) {
	const blockDef = {
		_tmpl: NULL,
		_html: html,
		_descriptors: descriptors
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
 * Walk a cloned DOM tree following a childNodes path.
 * Path [1, 0] means root.childNodes[1].childNodes[0].
 */
function walkDomPath(root, desc, start, end) {
	let node = root;
	for (let i = start; i < end; i++) {
		node = node.childNodes[desc[i]];
	}
	return node;
}

/**
 * Mount a template-based block: cloneNode + set slot values.
 * Completely bypasses VNode creation and diff.
 */
function mountTemplateBlock(
	blockDef,
	newExprs,
	parentDom,
	oldDom,
	namespace,
	doc
) {
	// Lazily create the <template> element
	if (!blockDef._tmpl) {
		blockDef._tmpl = doc.createElement('template');
		blockDef._tmpl.innerHTML = blockDef._html;
	}

	const dom = blockDef._tmpl.content.firstChild.cloneNode(true);
	const descriptors = blockDef._descriptors;
	const propSlots = [];
	const contentSlots = [];

	for (let d = 0; d < descriptors.length; d++) {
		const desc = descriptors[d];
		const exprIdx = desc[0];
		const type = desc[1];

		if (type === 'p') {
			// Prop slot: [exprIdx, 'p', ...domPath, propName]
			const propName = desc[desc.length - 1];
			const target = walkDomPath(dom, desc, 2, desc.length - 1);
			setProperty(target, propName, newExprs[exprIdx], NULL, namespace);
			propSlots[exprIdx] = { dom: target, prop: propName };
		} else {
			// Content slot: [exprIdx, 'c', ...domPath]
			const target = walkDomPath(dom, desc, 2, desc.length);
			const expr = newExprs[exprIdx];
			const textNode = doc.createTextNode(expr == NULL ? '' : expr);
			target.appendChild(textNode);

			// Create a minimal text VNode for tracking
			const textVNode = createVNode(NULL, expr, NULL, NULL, NULL);
			textVNode._dom = textNode;
			contentSlots[exprIdx] = {
				parentDom: target,
				childVNode: textVNode
			};
		}
	}

	// Insert into parent DOM
	parentDom.insertBefore(dom, oldDom || NULL);

	return { dom, propSlots, contentSlots };
}

// ─── Render-function block (runtime discovery) ───────────────────────

function createRenderBlock(renderFn) {
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

function wrapSlotExpr(expr) {
	return isArray(expr)
		? createVNode(Fragment, { children: expr }, NULL, NULL, NULL)
		: expr;
}

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

function resolveVNodeAtPath(tree, path) {
	let node = tree;
	for (let i = 0; i < path.length; i++) {
		node = node._children[path[i]];
	}
	return node;
}

function collectChildVNodes(contentSlots, out) {
	for (let i = 0; i < contentSlots.length; i++) {
		if (contentSlots[i] && contentSlots[i].childVNode) {
			out.push(contentSlots[i].childVNode);
		}
	}
}

// ─── diffBlock — handles both template and render-function blocks ────

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
		// ── MOUNT ──

		if (blockDef._html) {
			// Template-based mount: cloneNode, no VNodes, no diff
			const result = mountTemplateBlock(
				blockDef,
				newExprs,
				parentDom,
				oldDom,
				namespace,
				doc
			);

			newVNode._dom = result.dom;
			result.dom._blockPropSlots = result.propSlots;
			result.dom._blockContentSlots = result.contentSlots;

			newVNode._children = [];
			collectChildVNodes(result.contentSlots, newVNode._children);

			// Advance oldDom past the inserted block
			oldDom = result.dom;
		} else {
			// Render-function mount: h() + diff (runtime discovery)
			const isFirstMount = !blockDef._propSlotPaths;

			const slotFn = isFirstMount
				? i => ({ [CONTENT_SLOT]: i })
				: i => wrapSlotExpr(newExprs[i]);

			const propFn = isFirstMount
				? i => ({ [PROP_SLOT]: i })
				: i => newExprs[i];

			const tree = blockDef._render(slotFn, propFn);

			let propSlots, contentSlots;

			if (isFirstMount) {
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

				for (let i = 0; i < propSlots.length; i++) {
					if (propSlots[i]) propSlots[i].dom = propSlots[i].vnode._dom;
				}

				contentSlots = [];
				for (let i = 0; i < blockDef._contentSlotPaths.length; i++) {
					const sp = blockDef._contentSlotPaths[i];
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

				propSlots = [];
				const pPaths = blockDef._propSlotPaths;
				for (let i = 0; i < pPaths.length; i++) {
					if (pPaths[i]) {
						const vnode = resolveVNodeAtPath(tree, pPaths[i].path);
						propSlots[i] = {
							dom: vnode._dom,
							prop: pPaths[i].prop
						};
					}
				}

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

			newVNode._children = [];
			collectChildVNodes(contentSlots, newVNode._children);
		}
	} else {
		// ── UPDATE (shared by both template and render-function blocks) ──
		const oldExprs = oldVNode.props;
		const propSlots = oldVNode._dom._blockPropSlots;
		const contentSlots = oldVNode._dom._blockContentSlots;

		for (let i = 0; i < newExprs.length; i++) {
			if (newExprs[i] === oldExprs[i]) continue;

			if (propSlots[i]) {
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
					oldChild._dom.data = newExpr;
					oldChild.props = newExpr;
				} else if (
					oldChild &&
					oldChild.type === Fragment &&
					oldChild._component
				) {
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

		newVNode._children = [];
		collectChildVNodes(contentSlots, newVNode._children);
	}

	return oldDom;
}
