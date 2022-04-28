import { patchChildren, insertComponentDom } from './children';
import { setProperty } from './props';
import options from '../options';
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
	DIRTY_BIT,
	FORCE_UPDATE
} from '../constants';
import { getDomSibling, getParentContext, getParentDom } from '../tree';
import { mountChildren } from './mount';
import { Fragment } from '../create-element';
import { commitQueue } from './renderer';

/**
 * Diff two virtual nodes and apply proper changes to the DOM
 * @param {import('../internal').Internal} internal The Internal node to patch
 * @param {import('../internal').VNode | string} vnode The new virtual node
 */
export function patch(internal, vnode) {
	let diffHook;
	if ((diffHook = options._diff)) diffHook(internal, vnode);

	let flags = internal.flags;
	let prevProps = internal.props;

	if (flags & TYPE_TEXT) {
		if (prevProps !== vnode) {
			internal.props = vnode;
			// @ts-ignore We know that newVNode is string/number/bigint, and internal._dom is Text
			internal._dom.data = vnode;
		}
	}
	// When passing through createElement it assigns the object
	// constructor as undefined. This to prevent JSON-injection.
	else if (vnode.constructor === UNDEFINED) {
		// @ts-ignore vnode is never a string here
		let newProps = vnode.props;
		internal.props = newProps;

		// Root nodes render their children into a specific parent DOM element.
		// They can occur anywhere in the tree, can be nested, and currently allow reparenting during patches.
		// @TODO: Decide if we actually want to support silent reparenting during patch - is it worth the bytes?
		if (flags & TYPE_ROOT) {
			let parentDom = newProps._parentDom;

			if (parentDom !== prevProps._parentDom) {
				// Suspended trees are re-parented into the same parent so they can be inserted/removed without diffing.
				// For that to work, when createPortal is used to render into the nearest element parent, we insert in-order.
				let nextSibling =
					parentDom == getParentDom(internal._parent)
						? getDomSibling(internal)
						: null;
				insertComponentDom(internal, nextSibling, parentDom);
			}
		}

		// Switch from MODE_PENDING_ERROR to MODE_RERENDERING_ERROR:
		if (flags & MODE_PENDING_ERROR) {
			flags = internal.flags ^= MODE_PENDING_ERROR | MODE_RERENDERING_ERROR;
		}

		// @ts-ignore vnode is never a string here
		let isSameVNode = vnode._vnodeId === internal._vnodeId;

		if (!isSameVNode || (flags & FORCE_UPDATE) !== 0) {
			if (flags & TYPE_ELEMENT) {
				patchElement(
					internal,
					// @ts-ignore _dom is a PreactElement here
					internal._dom,
					prevProps,
					newProps,
					flags
				);
			} else {
				patchComponent(
					internal,
					internal._component,
					prevProps,
					newProps,
					flags
				);

				if (internal._commitCallbacks.length) {
					commitQueue.push(internal);
				}
			}

			// Once we have successfully rendered the new VNode, copy it's ID over
			// @ts-ignore vnode is never a string here
			internal._vnodeId = vnode._vnodeId;

			internal._prevRef = internal.ref;
			// @ts-ignore vnode is never a string here
			internal.ref = vnode.ref;
		}
	}

	// We successfully rendered this VNode, unset any stored hydration/bailout state:
	internal.flags &= RESET_MODE;

	if ((diffHook = options.diffed)) diffHook(internal);
}

/**
 * @param {import('../internal').Internal} internal
 * @param {import('../internal').Component} inst
 * @param {any} prevProps
 * @param {any} newProps
 * @param {import('../internal').Internal['flags']} flags
 */
function patchComponent(internal, inst, prevProps, newProps, flags) {
	let type = /** @type {import('../internal').ComponentType} */ (internal.type);

	let context = getParentContext(internal);

	let snapshot;

	let prevState = inst.state;
	if (inst._nextState == null) {
		inst._nextState = prevState;
	}

	// Necessary for createContext api. Setting this property will pass
	// the context value as `this.context` just for this component.
	let tmp = type.contextType;
	let provider = tmp && context[tmp._id];
	let componentContext = tmp
		? provider
			? provider.props.value
			: tmp._defaultValue
		: context;
	// inst.context = componentContext;

	try {
		if (type.getDerivedStateFromProps != null) {
			if (inst._nextState === prevState) {
				inst._nextState = Object.assign({}, inst._nextState);
			}

			Object.assign(
				inst._nextState,
				type.getDerivedStateFromProps(newProps, inst._nextState)
			);
		} else if (
			newProps !== prevProps &&
			inst.componentWillReceiveProps != null
		) {
			inst.componentWillReceiveProps(newProps, componentContext);
		}

		if (
			!(flags & FORCE_UPDATE) &&
			inst.shouldComponentUpdate != null &&
			inst.shouldComponentUpdate(
				newProps,
				inst._nextState,
				componentContext
			) === false
		) {
			inst.state = inst._nextState;
			inst._nextState = null;
			inst.props = newProps;

			// @TODO: should this really be flipped?
			internal.flags &= ~DIRTY_BIT;
			return;
		}

		if (inst.componentWillUpdate != null) {
			inst.componentWillUpdate(newProps, inst._nextState, componentContext);
		}

		inst.context = componentContext;
		inst.props = newProps;
		inst.state = inst._nextState;

		let renderHook = options._render;
		let renderResult;

		// note: disable repeat render invocation for class components
		if (flags & TYPE_CLASS) {
			internal.flags &= ~DIRTY_BIT;
			if (renderHook) renderHook(internal);
			renderResult = inst.render(inst.props, inst.state, inst.context);
		} else {
			let counter = 0;
			while (counter++ < 25) {
				// mark as clean:
				internal.flags &= ~DIRTY_BIT;
				if (renderHook) renderHook(internal);
				renderResult = type.call(inst, inst.props, inst.context);
				// re-render if marked as dirty:
				if (!(internal.flags & DIRTY_BIT)) {
					break;
				}
			}
		}

		// Handle setState called in render, see #2553
		inst.state = inst._nextState;
		// inst._nextState = null;

		if (inst.getChildContext != null) {
			internal._context = Object.assign({}, context, inst.getChildContext());
		}

		if (inst.getSnapshotBeforeUpdate != null) {
			snapshot = inst.getSnapshotBeforeUpdate(prevProps, prevState);
		}

		// Only schedule componentDidUpdate if the component successfully rendered
		if (inst.componentDidUpdate != null) {
			internal._commitCallbacks.push(() => {
				inst.componentDidUpdate(prevProps, prevState, snapshot);
			});
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

		if (internal._children == null) {
			let siblingDom;
			if (flags & MODE_HYDRATE) {
				siblingDom = flags & MODE_SUSPENDED ? internal._dom : null;
			} else {
				siblingDom = getDomSibling(internal);
			}

			mountChildren(internal, renderResult, siblingDom);
		} else {
			patchChildren(internal, renderResult);
		}
	} catch (e) {
		// @TODO: assign a new VNode ID here? Or NaN?
		// newVNode._vnodeId = 0;
		internal.flags |= e.then ? MODE_SUSPENDED : MODE_ERRORED;
		options._catchError(e, internal);
	}
}

/**
 * Update an internal and its associated DOM element based on a new VNode
 * @param {import('../internal').Internal} internal
 * @param {import('../internal').PreactElement} dom
 * @param {any} oldProps
 * @param {any} newProps
 * @param {import('../internal').Internal['flags']} flags
 */
function patchElement(internal, dom, oldProps, newProps, flags) {
	let isSvg = flags & MODE_SVG,
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
			newChildren && Array.isArray(newChildren) ? newChildren : [newChildren]
		);
	}

	if (newProps.checked != null && dom._isControlled) {
		dom._prevValue = newProps.checked;
	} else if (newProps.value != null && dom._isControlled) {
		dom._prevValue = newProps.value;
	}
}
