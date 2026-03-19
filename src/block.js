import { createVNode, Fragment } from './create-element';
import { diff } from './diff/index';
import { diffChildren } from './diff/children';
import { setProperty } from './diff/props';
import { getDomSibling } from './component';
import {
	EMPTY_OBJ,
	NULL,
	UNDEFINED,
	SVG_NAMESPACE,
	MATH_NAMESPACE
} from './constants';
import options from './options';
import { isArray, slice } from './util';

/** Sentinel symbol for prop slot markers in VNode props */
const PROP_SLOT = Symbol.for('preact.propSlot');

/** Sentinel symbol for content slot markers in VNode children */
const CONTENT_SLOT = Symbol.for('preact.contentSlot');

/**
 * Create a block definition.
 *
 * Two forms:
 * 1. `block(renderFn)` — h()-based render function (runtime discovery)
 * 2. `block(html, descriptors, ns?)` — compiler-optimized template + cloneNode
 *
 * @param {string | Function} htmlOrRenderFn
 * @param {Array} [descriptors]
 * @param {string} [ns] — 'svg' or 'math' for namespace blocks
 * @returns {(...exprs: any[]) => import('./internal').VNode}
 */
export function block(htmlOrRenderFn, descriptors, ns) {
	if (typeof htmlOrRenderFn === 'string') {
		return createTemplateBlock(htmlOrRenderFn, descriptors, ns);
	}
	return createRenderBlock(htmlOrRenderFn);
}

// ─── Template-based block (compiler-optimized) ───────────────────────

function createTemplateBlock(html, descriptors, ns) {
	const blockDef = {
		_tmpl: NULL,
		_html: html,
		_descriptors: descriptors,
		_ns: ns || NULL,
		_rootTag: NULL
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
 * Lazily initialize the <template> element and cache the root tag name.
 * Handles SVG/MathML by wrapping in the appropriate namespace element.
 */
function initTemplate(blockDef, doc) {
	if (blockDef._tmpl) return;

	blockDef._tmpl = doc.createElement('template');

	if (blockDef._ns === 'svg') {
		blockDef._tmpl.innerHTML =
			'<svg xmlns="http://www.w3.org/2000/svg">' +
			blockDef._html +
			'</svg>';
	} else if (blockDef._ns === 'math') {
		blockDef._tmpl.innerHTML =
			'<math xmlns="http://www.w3.org/1998/Math/MathML">' +
			blockDef._html +
			'</math>';
	} else {
		blockDef._tmpl.innerHTML = blockDef._html;
	}

	// Cache root element reference and tag name.
	// For namespaced blocks, unwrap the svg/math wrapper.
	const root = blockDef._ns
		? blockDef._tmpl.content.firstChild.firstChild
		: blockDef._tmpl.content.firstChild;
	blockDef._rootTag = root ? root.localName : NULL;
}

/**
 * Get the clone source element from the template.
 */
function getCloneSource(blockDef) {
	return blockDef._ns
		? blockDef._tmpl.content.firstChild.firstChild
		: blockDef._tmpl.content.firstChild;
}

/**
 * Resolve the namespace string for setProperty calls.
 */
function resolveNamespace(blockDef, parentNamespace) {
	if (blockDef._ns === 'svg') return SVG_NAMESPACE;
	if (blockDef._ns === 'math') return MATH_NAMESPACE;
	return parentNamespace;
}

/**
 * Walk a DOM tree following a childNodes path.
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
 * Process slot descriptors against a DOM element. Sets prop values and
 * creates/claims content nodes. Used by both mount and hydrate paths.
 *
 * @param {Element} dom - The root DOM element
 * @param {Object} blockDef - Block definition
 * @param {any[]} newExprs - Expression values
 * @param {string} namespace - Resolved namespace for setProperty
 * @param {object} globalContext
 * @param {Array} commitQueue
 * @param {any[]} refQueue
 * @param {Document} doc
 * @param {boolean} isHydrating - If true, skip static props and claim existing text nodes
 * @returns {{ propSlots: Array, contentSlots: Array }}
 */
function processSlots(
	dom,
	blockDef,
	newExprs,
	namespace,
	globalContext,
	commitQueue,
	refQueue,
	doc,
	isHydrating
) {
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

			// During hydration, only set functions (event handlers).
			// Static props are already in the SSR HTML.
			if (
				!isHydrating ||
				typeof newExprs[exprIdx] == 'function'
			) {
				setProperty(
					target,
					propName,
					newExprs[exprIdx],
					NULL,
					namespace
				);
			}
			propSlots[exprIdx] = { dom: target, prop: propName };
		} else {
			// Content slot: [exprIdx, 'c', ...domPath]
			const target = walkDomPath(dom, desc, 2, desc.length);
			const expr = newExprs[exprIdx];

			if (isHydrating) {
				// Hydration: claim existing text node or diff VNode content
				if (expr != NULL && typeof expr == 'object') {
					// VNode or array: diff with existing DOM as excess children
					const child = isArray(expr)
						? createVNode(
								Fragment,
								{ children: expr },
								NULL,
								NULL,
								NULL
							)
						: expr;
					diff(
						target,
						child,
						EMPTY_OBJ,
						globalContext,
						namespace,
						target.firstChild
							? slice.call(target.childNodes)
							: NULL,
						commitQueue,
						target.firstChild,
						true,
						refQueue,
						doc
					);
					contentSlots[exprIdx] = {
						parentDom: target,
						childVNode: child
					};
				} else {
					// Primitive: find and claim existing text node
					let textNode = target.firstChild;
					while (textNode && textNode.nodeType !== 3)
						textNode = textNode.nextSibling;

					if (!textNode) {
						// Mismatch: no text node found, create one
						textNode = doc.createTextNode(
							expr == NULL ? '' : expr
						);
						target.appendChild(textNode);
					}

					const textVNode = createVNode(
						NULL,
						expr,
						NULL,
						NULL,
						NULL
					);
					textVNode._dom = textNode;
					contentSlots[exprIdx] = {
						parentDom: target,
						childVNode: textVNode
					};
				}
			} else {
				// Normal mount: create content
				if (expr != NULL && typeof expr == 'object') {
					const child = isArray(expr)
						? createVNode(
								Fragment,
								{ children: expr },
								NULL,
								NULL,
								NULL
							)
						: expr;
					diff(
						target,
						child,
						EMPTY_OBJ,
						globalContext,
						namespace,
						NULL,
						commitQueue,
						NULL,
						false,
						refQueue,
						doc
					);
					contentSlots[exprIdx] = {
						parentDom: target,
						childVNode: child
					};
				} else {
					const textNode = doc.createTextNode(
						expr == NULL ? '' : expr
					);
					target.appendChild(textNode);

					const textVNode = createVNode(
						NULL,
						expr,
						NULL,
						NULL,
						NULL
					);
					textVNode._dom = textNode;
					contentSlots[exprIdx] = {
						parentDom: target,
						childVNode: textVNode
					};
				}
			}
		}
	}

	return { propSlots, contentSlots };
}

/**
 * Mount a template-based block via cloneNode.
 * Does NOT insert into DOM — diffChildren's insert() handles positioning.
 */
function mountTemplateBlock(
	blockDef,
	newExprs,
	namespace,
	globalContext,
	commitQueue,
	refQueue,
	doc
) {
	const dom = getCloneSource(blockDef).cloneNode(true);
	const ns = resolveNamespace(blockDef, namespace);
	const { propSlots, contentSlots } = processSlots(
		dom,
		blockDef,
		newExprs,
		ns,
		globalContext,
		commitQueue,
		refQueue,
		doc,
		false
	);
	return { dom, propSlots, contentSlots };
}

/**
 * Hydrate a template-based block by claiming existing DOM nodes.
 * Returns null if no matching root element found (mismatch).
 */
function hydrateTemplateBlock(
	blockDef,
	newExprs,
	excessDomChildren,
	namespace,
	globalContext,
	commitQueue,
	refQueue,
	doc,
	newVNode
) {
	// Find root element in excess DOM children
	let dom = NULL;
	for (let i = 0; i < excessDomChildren.length; i++) {
		const node = excessDomChildren[i];
		if (
			node &&
			node.localName === blockDef._rootTag
		) {
			dom = node;
			excessDomChildren[i] = NULL;
			break;
		}
	}

	if (!dom) {
		// Mismatch: no matching element found
		if (options._hydrationMismatch)
			options._hydrationMismatch(newVNode, excessDomChildren);
		return NULL;
	}

	const ns = resolveNamespace(blockDef, namespace);
	const { propSlots, contentSlots } = processSlots(
		dom,
		blockDef,
		newExprs,
		ns,
		globalContext,
		commitQueue,
		refQueue,
		doc,
		true
	);
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
	if (
		!vnode ||
		typeof vnode != 'object' ||
		vnode.constructor !== UNDEFINED
	)
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
			// Template-based block
			if (options._diff) options._diff(newVNode);

			initTemplate(blockDef, doc);

			let result;

			if (isHydrating && excessDomChildren) {
				// Hydration: claim existing DOM
				result = hydrateTemplateBlock(
					blockDef,
					newExprs,
					excessDomChildren,
					namespace,
					globalContext,
					commitQueue,
					refQueue,
					doc,
					newVNode
				);
			}

			if (!result) {
				// Normal mount (or hydration mismatch fallback)
				result = mountTemplateBlock(
					blockDef,
					newExprs,
					namespace,
					globalContext,
					commitQueue,
					refQueue,
					doc
				);
			}

			newVNode._dom = result.dom;
			result.dom._blockPropSlots = result.propSlots;
			result.dom._blockContentSlots = result.contentSlots;

			newVNode._children = [];
			collectChildVNodes(result.contentSlots, newVNode._children);

			if (newVNode.ref) {
				refQueue.push(newVNode.ref, newVNode._dom, newVNode);
			}

			if (options.diffed) options.diffed(newVNode);
		} else {
			// Render-function block
			const isFirstMount = !blockDef._propSlotPaths;

			const slotFn = isFirstMount
				? (i) => ({ [CONTENT_SLOT]: i })
				: (i) => wrapSlotExpr(newExprs[i]);

			const propFn = isFirstMount
				? (i) => ({ [PROP_SLOT]: i })
				: (i) => newExprs[i];

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
				for (
					let i = 0;
					i < blockDef._contentSlotPaths.length;
					i++
				) {
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
						const vnode = resolveVNodeAtPath(
							tree,
							pPaths[i].path
						);
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
						const parentVNode = resolveVNodeAtPath(
							tree,
							cPaths[i].path
						);
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
					const oldParent = createVNode(
						NULL,
						NULL,
						NULL,
						NULL,
						NULL
					);
					oldParent._children = oldChild ? [oldChild] : [];

					const newParent = createVNode(
						NULL,
						NULL,
						NULL,
						NULL,
						NULL
					);

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

					cs.childVNode = newParent._children
						? newParent._children[0]
						: NULL;
				}
			}
		}

		newVNode._dom = oldVNode._dom;

		newVNode._children = [];
		collectChildVNodes(contentSlots, newVNode._children);
	}

	return oldDom;
}
