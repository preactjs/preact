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
 * Create a block definition.
 *
 * @param {() => Element} tplFn - Factory that builds and returns the
 *   template root element. Called lazily on first use.
 * @param {(root: Element, p: Function, c: Function) => void} slotsFn
 *   Compiler-generated function that navigates the cloned/hydrated DOM
 *   and registers each slot via callbacks:
 *   - `p(exprIdx, dom, propName)` — prop slot
 *   - `c(exprIdx, dom)` — content slot
 * @returns {(...exprs: any[]) => import('./internal').VNode}
 */
export function block(tplFn, slotsFn) {
	const blockDef = {
		_tplFn: tplFn,
		_root: NULL,
		_slotsFn: slotsFn,
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
 * Mount or hydrate a block.
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
	// Lazy template init on first use
	if (!blockDef._root) {
		blockDef._root = blockDef._tplFn();
		blockDef._rootTag = blockDef._root.localName;
	}

	let dom = NULL;
	let hydrated = false;

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

	if (!dom) {
		dom = blockDef._root.cloneNode(true);
	}

	const ns =
		dom.namespaceURI === SVG_NAMESPACE
			? SVG_NAMESPACE
			: dom.namespaceURI === MATH_NAMESPACE
				? MATH_NAMESPACE
				: namespace;

	const propSlots = [];
	const contentSlots = [];

	blockDef._slotsFn(
		dom,
		// p — prop slot registration
		(exprIdx, target, propName) => {
			if (!hydrated || typeof newExprs[exprIdx] == 'function') {
				setProperty(target, propName, newExprs[exprIdx], NULL, ns);
			}
			propSlots[exprIdx] = { dom: target, prop: propName };
		},
		// c — content slot registration
		(exprIdx, target) => {
			const expr = newExprs[exprIdx];

			if (expr != NULL && typeof expr == 'object') {
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
	);

	return { dom, propSlots, contentSlots };
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
