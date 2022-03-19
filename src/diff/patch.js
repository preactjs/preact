import { patchChildren, insertComponentDom } from './children';
import { setProperty } from './props';
import options from '../options';
import { renderClassComponent, renderFunctionComponent } from './component';
import {
	RESET_MODE,
	TYPE_TEXT,
	TYPE_ELEMENT,
	MODE_SUSPENDED,
	MODE_ERRORED,
	TYPE_ROOT,
	TYPE_CLASS,
	MODE_SVG,
	UNDEFINED,
	MODE_HYDRATE,
	MODE_PENDING_ERROR,
	MODE_RERENDERING_ERROR,
	SKIP_CHILDREN,
	DIRTY_BIT
} from '../constants';
import { getDomSibling, getParentContext } from '../tree';
import { mountChildren } from './mount';
import { Fragment } from '../create-element';

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
