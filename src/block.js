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

/**
 * Create a block definition. The compiler provides static HTML and slot
 * descriptors. Mount uses `<template>` + `cloneNode`, bypassing VNode
 * creation and diff for static structure.
 *
 * @param {string} html - Static HTML template
 * @param {Array} descriptors - Slot descriptors
 * @param {string} [ns] - 'svg' or 'math' for namespace blocks
 * @returns {(...exprs: any[]) => import('./internal').VNode}
 */
export function block(html, descriptors, ns) {
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
			const propName = desc[desc.length - 1];
			const target = walkDomPath(dom, desc, 2, desc.length - 1);

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
			const target = walkDomPath(dom, desc, 2, desc.length);
			const expr = newExprs[exprIdx];

			if (isHydrating) {
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
						target.firstChild
							? slice.call(target.childNodes)
							: NULL,
						commitQueue,
						target.firstChild,
						true,
						refQueue,
						doc
					);
					if (child._dom && !child._dom.parentNode) {
						target.appendChild(child._dom);
					}
					contentSlots[exprIdx] = {
						parentDom: target,
						childVNode: child
					};
				} else {
					let textNode = target.firstChild;
					while (textNode && textNode.nodeType !== 3)
						textNode = textNode.nextSibling;

					if (!textNode) {
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
					// diff() for blocks doesn't self-insert DOM.
					// Ensure the child's DOM is in the target element.
					if (child._dom && !child._dom.parentNode) {
						target.appendChild(child._dom);
					}
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
 * Mount a block via cloneNode.
 * Does NOT insert into DOM — diffChildren's insert() handles positioning.
 */
function mountBlock(blockDef, newExprs, namespace, globalContext, commitQueue, refQueue, doc) {
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
 * Hydrate a block by claiming existing DOM nodes.
 * Returns null if no matching root element found (mismatch).
 */
function hydrateBlock(
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
	let dom = NULL;
	for (let i = 0; i < excessDomChildren.length; i++) {
		const node = excessDomChildren[i];
		if (node && node.localName === blockDef._rootTag) {
			dom = node;
			excessDomChildren[i] = NULL;
			break;
		}
	}

	if (!dom) {
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

function wrapSlotExpr(expr) {
	return isArray(expr)
		? createVNode(Fragment, { children: expr }, NULL, NULL, NULL)
		: expr;
}

function collectChildVNodes(contentSlots, out) {
	for (let i = 0; i < contentSlots.length; i++) {
		if (contentSlots[i] && contentSlots[i].childVNode) {
			out.push(contentSlots[i].childVNode);
		}
	}
}

/**
 * Diff a block VNode. On mount, clones the template and processes slots.
 * On update, only diffs changed slots via direct DOM manipulation.
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
		// ── MOUNT ──
		// Note: options._diff and options.diffed are fired by diff() —
		// do NOT fire them here (would double-fire).

		initTemplate(blockDef, doc);

		let result;

		if (isHydrating && excessDomChildren) {
			result = hydrateBlock(
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
			result = mountBlock(
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
	} else {
		// ── UPDATE ──
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
					// Fast path: text → text
					oldChild._dom.data = newExpr;
					oldChild.props = newExpr;
				} else if (
					oldChild &&
					oldChild.type === Fragment &&
					oldChild._component
				) {
					// Array slot: diff Fragment
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
					// General path: diffChildren for type transitions etc.
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
