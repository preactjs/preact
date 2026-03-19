import { createVNode, Fragment } from './create-element';
import { diff } from './diff/index';
import { diffChildren } from './diff/children';
import { setProperty } from './diff/props';
import { getDomSibling } from './component';
import {
	EMPTY_OBJ,
	NULL,
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
 * @param {string} html
 * @param {Array} descriptors
 * @param {string} [ns] — 'svg' or 'math' for namespace blocks
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
 */
function initTemplate(blockDef, doc) {
	if (blockDef._tmpl) return;

	const ns = blockDef._ns;
	blockDef._tmpl = doc.createElement('template');
	blockDef._tmpl.innerHTML = ns
		? '<' +
			ns +
			(ns === 'svg'
				? ' xmlns="http://www.w3.org/2000/svg"'
				: ' xmlns="http://www.w3.org/1998/Math/MathML"') +
			'>' +
			blockDef._html +
			'</' +
			ns +
			'>'
		: blockDef._html;

	const root = ns
		? blockDef._tmpl.content.firstChild.firstChild
		: blockDef._tmpl.content.firstChild;
	blockDef._rootTag = root ? root.localName : NULL;
}

/** Walk a DOM tree following a childNodes path. */
function walkDomPath(root, desc, start, end) {
	let node = root;
	for (let i = start; i < end; i++) {
		node = node.childNodes[desc[i]];
	}
	return node;
}

/**
 * Mount or hydrate a block. If hydrating, claims existing DOM from
 * excessDomChildren. Otherwise clones from template.
 */
function mountOrHydrateBlock(
	blockDef,
	newExprs,
	namespace,
	globalContext,
	excessDomChildren,
	commitQueue,
	refQueue,
	doc,
	isHydrating,
	newVNode
) {
	let dom = NULL;
	let hydrated = false;

	// Hydration: try to claim existing root element
	if (isHydrating && excessDomChildren) {
		for (let i = 0; i < excessDomChildren.length; i++) {
			const node = excessDomChildren[i];
			if (node && node.localName === blockDef._rootTag) {
				dom = node;
				excessDomChildren[i] = NULL;
				hydrated = true;
				break;
			}
		}
		if (!dom && options._hydrationMismatch) {
			options._hydrationMismatch(newVNode, excessDomChildren);
		}
	}

	// Clone from template if not hydrating or hydration mismatch
	if (!dom) {
		const src = blockDef._ns
			? blockDef._tmpl.content.firstChild.firstChild
			: blockDef._tmpl.content.firstChild;
		dom = src.cloneNode(true);
	}

	const ns = blockDef._ns === 'svg'
		? SVG_NAMESPACE
		: blockDef._ns === 'math'
			? MATH_NAMESPACE
			: namespace;

	// Process all slot descriptors
	const descriptors = blockDef._descriptors;
	const propSlots = [];
	const contentSlots = [];

	for (let d = 0; d < descriptors.length; d++) {
		const desc = descriptors[d];
		const exprIdx = desc[0];
		const type = desc[1];

		if (type === 'p') {
			// Prop slot
			const propName = desc[desc.length - 1];
			const target = walkDomPath(dom, desc, 2, desc.length - 1);

			// During hydration skip static props, only set functions
			if (!hydrated || typeof newExprs[exprIdx] == 'function') {
				setProperty(target, propName, newExprs[exprIdx], NULL, ns);
			}
			propSlots[exprIdx] = { dom: target, prop: propName };
		} else {
			// Content slot
			const target = walkDomPath(dom, desc, 2, desc.length);
			const expr = newExprs[exprIdx];

			if (expr != NULL && typeof expr == 'object') {
				// VNode or array
				const child = isArray(expr)
					? createVNode(Fragment, { children: expr }, NULL, NULL, NULL)
					: expr;
				diff(
					target,
					child,
					EMPTY_OBJ,
					globalContext,
					ns,
					hydrated && target.firstChild
						? slice.call(target.childNodes)
						: NULL,
					commitQueue,
					hydrated ? target.firstChild : NULL,
					hydrated,
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
				// Primitive text
				let textNode;
				if (hydrated) {
					textNode = target.firstChild;
					while (textNode && textNode.nodeType !== 3)
						textNode = textNode.nextSibling;
				}
				if (!textNode) {
					textNode = doc.createTextNode(expr == NULL ? '' : expr);
					target.appendChild(textNode);
				}
				const textVNode = createVNode(NULL, expr, NULL, NULL, NULL);
				textVNode._dom = textNode;
				contentSlots[exprIdx] = {
					parentDom: target,
					childVNode: textVNode
				};
			}
		}
	}

	return { dom, propSlots, contentSlots };
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
		initTemplate(blockDef, doc);

		const result = mountOrHydrateBlock(
			blockDef,
			newExprs,
			namespace,
			globalContext,
			excessDomChildren,
			commitQueue,
			refQueue,
			doc,
			isHydrating,
			newVNode
		);

		newVNode._dom = result.dom;
		result.dom._blockPropSlots = result.propSlots;
		result.dom._blockContentSlots = result.contentSlots;

		newVNode._children = [];
		for (let i = 0; i < result.contentSlots.length; i++) {
			if (result.contentSlots[i] && result.contentSlots[i].childVNode) {
				newVNode._children.push(result.contentSlots[i].childVNode);
			}
		}

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
					// General path: diffChildren for type transitions
					const oldParent = createVNode(NULL, NULL, NULL, NULL, NULL);
					oldParent._children = oldChild ? [oldChild] : [];
					const newParent = createVNode(NULL, NULL, NULL, NULL, NULL);

					diffChildren(
						cs.parentDom,
						[
							isArray(newExpr)
								? createVNode(
										Fragment,
										{ children: newExpr },
										NULL,
										NULL,
										NULL
									)
								: newExpr
						],
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
		for (let i = 0; i < contentSlots.length; i++) {
			if (contentSlots[i] && contentSlots[i].childVNode) {
				newVNode._children.push(contentSlots[i].childVNode);
			}
		}
	}

	return oldDom;
}
