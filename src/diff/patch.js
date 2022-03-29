import { setProperty } from './props';
import options from '../options';
import { renderClassComponent, renderFunctionComponent } from './component';
import {
	UNDEFINED,
	EMPTY_ARR,
	TYPE_TEXT,
	TYPE_ELEMENT,
	TYPE_DOM,
	TYPE_ROOT,
	TYPE_COMPONENT,
	TYPE_CLASS,
	MODE_SUSPENDED,
	MODE_ERRORED,
	MODE_SVG,
	MODE_HYDRATE,
	MODE_PENDING_ERROR,
	MODE_RERENDERING_ERROR,
	RESET_MODE,
	SKIP_CHILDREN,
	DIRTY_BIT
} from '../constants';
import { createInternal, getDomSibling, getParentContext } from '../tree';
import { mount, mountChildren } from './mount';
import { unmount } from './unmount';
import { Fragment, normalizeToVNode } from '../create-element';
import { applyRef } from './refs';

/**
 * Diff two virtual nodes and apply proper changes to the DOM
 * @param {import('../internal').Internal} internal The Internal node to patch
 * @param {import('../internal').VNode | string} vnode The new virtual node
 * @param {import('../internal').CommitQueue} commitQueue
 * @param {import('../internal').PreactElement} parentDom The parent DOM element for insertion/deletions
 */
export function patch(internal, vnode, commitQueue, parentDom) {
	let flags = internal.flags;

	if (flags & TYPE_TEXT) {
		if (vnode !== internal.props) {
			// @ts-ignore We know that newVNode is string/number/bigint, and internal._dom is Text
			internal._dom.data = vnode;
			internal.props = vnode;
		}

		return;
	}

	// When passing through createElement it assigns the object
	// constructor as undefined. This to prevent JSON-injection.
	if (vnode.constructor !== UNDEFINED) return;

	if (options._diff) options._diff(internal, vnode);

	// Root nodes render their children into a specific parent DOM element.
	// They can occur anywhere in the tree, can be nested, and currently allow reparenting during patches.
	// @TODO: Decide if we actually want to support silent reparenting during patch - is it worth the bytes?
	let prevParentDom = parentDom;
	if (flags & TYPE_ROOT) {
		parentDom = vnode.props._parentDom;

		if (internal.props._parentDom !== vnode.props._parentDom) {
			let nextSibling =
				parentDom == prevParentDom ? getDomSibling(internal) : null;
			insertComponentDom(internal, nextSibling, parentDom);
		}
	}

	if (flags & TYPE_ELEMENT) {
		if (vnode._vnodeId !== internal._vnodeId) {
			// @ts-ignore dom is a PreactElement here
			patchElement(internal, vnode, commitQueue);
		}
	} else {
		try {
			if (internal.flags & MODE_PENDING_ERROR) {
				// Toggle the MODE_PENDING_ERROR and MODE_RERENDERING_ERROR flags. In
				// actuality, this should turn off the MODE_PENDING_ERROR flag and turn on
				// the MODE_RERENDERING_ERROR flag.
				internal.flags ^= MODE_PENDING_ERROR | MODE_RERENDERING_ERROR;
			}

			const context = getParentContext(internal);

			// Necessary for createContext api. Setting this property will pass
			// the context value as `this.context` just for this component.
			let tmp = vnode.type.contextType;
			let provider = tmp && context[tmp._id];
			let componentContext = tmp
				? provider
					? provider.props.value
					: tmp._defaultValue
				: context;
			let isNew = !internal || !internal._component;

			let renderResult;

			if (internal.flags & TYPE_CLASS) {
				renderResult = renderClassComponent(
					internal,
					vnode,
					context,
					componentContext
				);
			} else {
				renderResult = renderFunctionComponent(
					internal,
					vnode,
					context,
					componentContext
				);
			}

			if (renderResult == null) {
				renderResult = [];
			} else if (typeof renderResult === 'object') {
				if (renderResult.type === Fragment && renderResult.key == null) {
					renderResult = renderResult.props.children;
				}
				if (!Array.isArray(renderResult)) {
					renderResult = [renderResult];
				}
			} else {
				renderResult = [renderResult];
			}

			if (internal.flags & SKIP_CHILDREN) {
				internal.props = vnode.props;
				internal.flags &= ~SKIP_CHILDREN;
				// More info about this here: https://gist.github.com/JoviDeCroock/bec5f2ce93544d2e6070ef8e0036e4e8
				if (vnode && vnode._vnodeId !== internal._vnodeId) {
					internal.flags &= ~DIRTY_BIT;
				}
			} else if (internal._children == null) {
				let siblingDom =
					(internal.flags & (MODE_HYDRATE | MODE_SUSPENDED)) ===
					(MODE_HYDRATE | MODE_SUSPENDED)
						? internal._dom
						: isNew || internal.flags & MODE_HYDRATE
						? null
						: getDomSibling(internal);

				mountChildren(
					internal,
					renderResult,
					commitQueue,
					parentDom,
					siblingDom
				);
			} else {
				patchChildren(internal, renderResult, commitQueue, parentDom);
			}

			if (
				internal._commitCallbacks != null &&
				internal._commitCallbacks.length
			) {
				commitQueue.push(internal);
			}
		} catch (e) {
			// @TODO: assign a new VNode ID here? Or NaN?
			// newVNode._vnodeId = 0;
			internal.flags |= e.then ? MODE_SUSPENDED : MODE_ERRORED;
			options._catchError(e, internal);
		}
	}

	if (options.diffed) options.diffed(internal);

	// We successfully rendered this VNode, unset any stored hydration/bailout state:
	internal.flags &= RESET_MODE;

	// Once we have successfully rendered the new VNode, copy it's ID over
	internal._vnodeId = vnode._vnodeId;

	internal._prevRef = internal.ref;
	internal.ref = vnode.ref;
}

/**
 * Update an internal and its associated DOM element based on a new VNode
 * @param {import('../internal').Internal} internal
 * @param {import('../internal').VNode} vnode A VNode with props to compare and apply
 * @param {import('../internal').CommitQueue} commitQueue
 */
function patchElement(internal, vnode, commitQueue) {
	let dom = /** @type {import('../internal').PreactElement} */ (internal._dom),
		oldProps = internal.props,
		newProps = (internal.props = vnode.props),
		isSvg = internal.flags & MODE_SVG,
		i,
		value,
		tmp,
		newHtml,
		oldHtml,
		newChildren;

	for (i in oldProps) {
		value = oldProps[i];
		if (i === 'children') {
		} else if (i === 'dangerouslySetInnerHTML') {
			oldHtml = value;
		} else if (!(i in newProps)) {
			setProperty(dom, i, null, value, isSvg);
		}
	}

	for (i in newProps) {
		value = newProps[i];
		if (i === 'children') {
			newChildren = value;
		} else if (i === 'dangerouslySetInnerHTML') {
			newHtml = value;
		} else if (
			value !== (tmp = oldProps[i]) ||
			((i === 'checked' || i === 'value') && value != null && value !== dom[i])
		) {
			setProperty(dom, i, value, tmp, isSvg);
		}
	}

	// If the new vnode didn't have dangerouslySetInnerHTML, diff its children
	if (newHtml) {
		value = newHtml.__html;
		// Avoid re-applying the same '__html' if it did not changed between re-render
		if (!oldHtml || (value !== oldHtml.__html && value !== dom.innerHTML)) {
			dom.innerHTML = value;
		}
		internal._children = null;
	} else {
		if (oldHtml) dom.innerHTML = '';

		patchChildren(
			internal,
			newChildren && Array.isArray(newChildren) ? newChildren : [newChildren],
			commitQueue,
			dom
		);
	}

	if (newProps.checked != null && dom._isControlled) {
		dom._prevValue = newProps.checked;
	} else if (newProps.value != null && dom._isControlled) {
		dom._prevValue = newProps.value;
	}
}

/**
 * Update an internal with new children.
 * @param {import('../internal').Internal} internal The internal whose children should be patched
 * @param {import('../internal').ComponentChild[]} children The new children, represented as VNodes
 * @param {import('../internal').CommitQueue} commitQueue
 * @param {import('../internal').PreactElement} parentDom
 */
function patchChildren(internal, children, commitQueue, parentDom) {
	let oldChildren =
		(internal._children && internal._children.slice()) || EMPTY_ARR;

	let oldChildrenLength = oldChildren.length;
	let remainingOldChildren = oldChildrenLength;

	let skew = 0;
	let i;

	/** @type {import('../internal').Internal} */
	let childInternal;

	/** @type {import('../internal').ComponentChild} */
	let childVNode;

	/** @type {import('../internal').Internal[]} */
	const newChildren = [];

	for (i = 0; i < children.length; i++) {
		childVNode = normalizeToVNode(children[i]);

		// Terser removes the `continue` here and wraps the loop body
		// in a `if (childVNode) { ... } condition
		if (childVNode == null) {
			newChildren[i] = null;
			continue;
		}

		let skewedIndex = i + skew;

		/// TODO: Reconsider if we should bring back the "not moving text nodes" logic?
		let matchingIndex = findMatchingIndex(
			childVNode,
			oldChildren,
			skewedIndex,
			remainingOldChildren
		);

		if (matchingIndex === -1) {
			childInternal = UNDEFINED;
		} else {
			childInternal = oldChildren[matchingIndex];
			oldChildren[matchingIndex] = UNDEFINED;
			remainingOldChildren--;
		}

		let mountingChild = childInternal == null;

		if (mountingChild) {
			childInternal = createInternal(childVNode, internal);

			// We are mounting a new VNode
			mount(
				childInternal,
				childVNode,
				commitQueue,
				parentDom,
				getDomSibling(internal, skewedIndex)
			);
		}
		// If this node suspended during hydration, and no other flags are set:
		// @TODO: might be better to explicitly check for MODE_ERRORED here.
		else if (
			(childInternal.flags & (MODE_HYDRATE | MODE_SUSPENDED)) ===
			(MODE_HYDRATE | MODE_SUSPENDED)
		) {
			// We are resuming the hydration of a VNode
			mount(
				childInternal,
				childVNode,
				commitQueue,
				parentDom,
				childInternal._dom
			);
		} else {
			// Morph the old element into the new one, but don't append it to the dom yet
			patch(childInternal, childVNode, commitQueue, parentDom);
		}

		go: if (mountingChild) {
			if (matchingIndex == -1) {
				skew--;
			}

			// Perform insert of new dom
			if (childInternal.flags & TYPE_DOM) {
				let nextSibling = getDomSibling(internal, skewedIndex);
				parentDom.insertBefore(childInternal._dom, nextSibling);
			}
		} else if (matchingIndex !== skewedIndex) {
			// Move this DOM into its correct place
			if (matchingIndex === skewedIndex + 1) {
				skew++;
				break go;
			} else if (matchingIndex > skewedIndex) {
				if (remainingOldChildren > children.length - skewedIndex) {
					skew += matchingIndex - skewedIndex;
					break go;
				} else {
					// ### Change from keyed: I think this was missing from the algo...
					skew--;
				}
			} else if (matchingIndex < skewedIndex) {
				if (matchingIndex == skewedIndex - 1) {
					skew = matchingIndex - skewedIndex;
				} else {
					skew = 0;
				}
			} else {
				skew = 0;
			}

			skewedIndex = i + skew;

			if (matchingIndex == i) break go;

			let nextSibling = getDomSibling(internal, skewedIndex + 1);
			if (childInternal.flags & TYPE_DOM) {
				parentDom.insertBefore(childInternal._dom, nextSibling);
			} else {
				insertComponentDom(childInternal, nextSibling, parentDom);
			}
		}

		newChildren[i] = childInternal;
	}

	internal._children = newChildren;

	// Remove remaining oldChildren if there are any.
	if (remainingOldChildren > 0) {
		for (i = oldChildrenLength; i--; ) {
			if (oldChildren[i] != null) {
				unmount(oldChildren[i], oldChildren[i]);
			}
		}
	}

	// Set refs only after unmount
	for (i = 0; i < newChildren.length; i++) {
		childInternal = newChildren[i];
		if (childInternal) {
			let oldRef = childInternal._prevRef;
			if (childInternal.ref != oldRef) {
				if (oldRef) applyRef(oldRef, null, childInternal);
				if (childInternal.ref)
					applyRef(
						childInternal.ref,
						childInternal._component || childInternal._dom,
						childInternal
					);
			}
		}
	}
}

/**
 * @param {import('../internal').VNode | string} childVNode
 * @param {import('../internal').Internal[]} oldChildren
 * @param {number} skewedIndex
 * @param {number} remainingOldChildren
 * @returns {number}
 */
function findMatchingIndex(
	childVNode,
	oldChildren,
	skewedIndex,
	remainingOldChildren
) {
	const type = typeof childVNode === 'string' ? null : childVNode.type;
	const key = type !== null ? childVNode.key : UNDEFINED;
	let match = -1;
	let x = skewedIndex - 1; // i - 1;
	let y = skewedIndex + 1; // i + 1;
	let oldChild = oldChildren[skewedIndex]; // i

	if (
		// ### Change from keyed: support for matching null placeholders
		oldChild === null ||
		(oldChild != null && oldChild.type === type && oldChild.key == key)
	) {
		match = skewedIndex; // i
	}
	// If there are any unused children left (ignoring an available in-place child which we just checked)
	else if (remainingOldChildren > (oldChild != null ? 1 : 0)) {
		// eslint-disable-next-line no-constant-condition
		while (true) {
			if (x >= 0) {
				oldChild = oldChildren[x];
				if (oldChild != null && oldChild.type === type && oldChild.key == key) {
					match = x;
					break;
				}
				x--;
			}
			if (y < oldChildren.length) {
				oldChild = oldChildren[y];
				if (oldChild != null && oldChild.type === type && oldChild.key == key) {
					match = y;
					break;
				}
				y++;
			} else if (x < 0) {
				break;
			}
		}
	}

	return match;
}

/**
 * @param {import('../internal').Internal} internal
 * @param {import('../internal').PreactNode} nextSibling
 * @param {import('../internal').PreactNode} parentDom
 */
function insertComponentDom(internal, nextSibling, parentDom) {
	if (internal._children == null) {
		return;
	}

	for (let i = 0; i < internal._children.length; i++) {
		let childInternal = internal._children[i];
		if (childInternal) {
			childInternal._parent = internal;

			if (childInternal.flags & TYPE_COMPONENT) {
				insertComponentDom(childInternal, nextSibling, parentDom);
			} else if (childInternal._dom != nextSibling) {
				parentDom.insertBefore(childInternal._dom, nextSibling);
			}
		}
	}
}
