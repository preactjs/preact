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
	SKIP_CHILDREN,
	DIRTY_BIT,
	FORCE_UPDATE
} from '../constants';
import { getDomSibling, getParentContext } from '../tree';
import { mountChildren } from './mount';
import { Fragment } from '../create-element';
import { ENABLE_CLASSES } from '../component';
import { commitQueue } from './commit';

/**
 * Diff two virtual nodes and apply proper changes to the DOM
 * @param {import('../internal').Internal} internal The Internal node to patch
 * @param {import('../internal').VNode | string} vnode The new virtual node
 * @param {import('../internal').PreactElement} parentDom The element into which this subtree is rendered
 */
export function patch(internal, vnode, parentDom) {
	let flags = internal.flags;

	if (flags & TYPE_TEXT) {
		if (vnode !== internal.props) {
			// @ts-ignore We know that newVNode is string/number/bigint, and internal.data is Text
			internal.data.data = vnode;
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
			patchElement(internal, vnode);
			internal.props = vnode.props;
		}
	} else {
		if (flags & MODE_PENDING_ERROR) {
			// Toggle the MODE_PENDING_ERROR and MODE_RERENDERING_ERROR flags. In
			// actuality, this should turn off the MODE_PENDING_ERROR flag and turn on
			// the MODE_RERENDERING_ERROR flag.
			internal.flags ^= MODE_PENDING_ERROR | MODE_RERENDERING_ERROR;
		}

		try {
			let renderResult;
			if (internal._vnodeId === vnode._vnodeId) {
				internal.flags |= SKIP_CHILDREN;
			} else {
				renderResult = patchComponent(internal, vnode);
			}

			if (internal.flags & SKIP_CHILDREN) {
				internal._component.props = internal.props = vnode.props;
				if (vnode._vnodeId !== internal._vnodeId) {
					internal.flags &= ~DIRTY_BIT;
				}
			} else if (internal._children == null) {
				let siblingDom =
					(internal.flags & (MODE_HYDRATE | MODE_SUSPENDED)) ===
					(MODE_HYDRATE | MODE_SUSPENDED)
						? internal.data
						: internal.flags & MODE_HYDRATE
						? null
						: getDomSibling(internal);

				mountChildren(internal, renderResult, parentDom, siblingDom);
			} else {
				patchChildren(internal, renderResult, parentDom);
			}

			// TODO: for some reason lazy-hydration stops working as .data is assigned a DOM-node
			// for Preact.lazy
			if (
				internal.data._commitCallbacks &&
				internal.data._commitCallbacks.length
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
 */
function patchElement(internal, vnode) {
	let dom = /** @type {import('../internal').PreactElement} */ (internal.data),
		oldProps = internal.props,
		newProps = vnode.props,
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
			dom
		);
	}
}

/**
 * @param {import('../internal').ComponentInternal} internal The component's backing Internal node
 * @param {import('../internal').VNode} newVNode The new virtual node
 * @returns {import('../internal').ComponentChildren} the component's children
 */
function patchComponent(internal, newVNode) {
	let type = /** @type {import('../internal').ComponentType} */ (internal.type);
	let snapshot,
		c = internal._component,
		newProps = newVNode.props;

	// Necessary for createContext api. Setting this property will pass
	// the context value as `this.context` just for this component.
	let context = getParentContext(internal);
	let tmp = newVNode.type.contextType;
	let provider = tmp && context[tmp._id];
	let componentContext = tmp
		? provider
			? provider.props.value
			: tmp._defaultValue
		: context;

	if (c._nextState == null) {
		c._nextState = c.state;
	}

	let oldProps = c.props;
	let oldState = c.state;

	if (ENABLE_CLASSES) {
		if (type.getDerivedStateFromProps != null) {
			if (c._nextState == c.state) {
				c._nextState = Object.assign({}, c._nextState);
			}

			Object.assign(
				c._nextState,
				type.getDerivedStateFromProps(newProps, c._nextState)
			);
		}

		if (
			type.getDerivedStateFromProps == null &&
			newProps !== oldProps &&
			c.componentWillReceiveProps != null
		) {
			c.componentWillReceiveProps(newProps, componentContext);
		}
	}

	if (
		!(internal.flags & FORCE_UPDATE) &&
		c.shouldComponentUpdate != null &&
		c.shouldComponentUpdate(newProps, c._nextState, componentContext) === false
	) {
		c.props = newProps;
		c.state = c._nextState;
		internal.flags |= SKIP_CHILDREN;
		for (let i = 0; i < internal.data._stateCallbacks.length; i++) {
			internal.data._commitCallbacks.push(internal.data._stateCallbacks[i]);
		}
		internal.data._stateCallbacks = [];
		return;
	}

	if (ENABLE_CLASSES && c.componentWillUpdate != null) {
		c.componentWillUpdate(newProps, c._nextState, componentContext);
	}

	c.context = componentContext;
	internal.props = c.props = newProps;
	c.state = c._nextState;

	let renderHook = options._render;
	if (renderHook) renderHook(internal);

	let counter = 0,
		renderResult;
	while (counter++ < 25) {
		internal.flags &= ~DIRTY_BIT;
		if (renderHook) renderHook(internal);
		if (ENABLE_CLASSES && internal.flags & TYPE_CLASS) {
			renderResult = c.render(c.props, c.state, c.context);
			for (let i = 0; i < internal.data._stateCallbacks.length; i++) {
				internal.data._commitCallbacks.push(internal.data._stateCallbacks[i]);
			}
			internal.data._stateCallbacks = [];
			// note: disable repeat render invocation for class components
			break;
		} else {
			renderResult = type.call(c, c.props, c.context);
		}
		if (!(internal.flags & DIRTY_BIT)) {
			break;
		}
	}

	// Handle setState called in render, see #2553
	c.state = c._nextState;

	if (c.getChildContext != null) {
		internal.data._context = Object.assign({}, context, c.getChildContext());
	}

	if (ENABLE_CLASSES) {
		if (c.getSnapshotBeforeUpdate != null) {
			snapshot = c.getSnapshotBeforeUpdate(oldProps, oldState);
		}

		// Only schedule componentDidUpdate if the component successfully rendered
		if (c.componentDidUpdate != null) {
			internal.data._commitCallbacks.push(() => {
				c.componentDidUpdate(oldProps, oldState, snapshot);
			});
		}
	}

	if (renderResult == null) {
		renderResult = [];
	} else if (typeof renderResult == 'object') {
		if (renderResult.type === Fragment && renderResult.key == null) {
			renderResult = renderResult.props.children;
		}
		if (!Array.isArray(renderResult)) {
			renderResult = [renderResult];
		}
	} else {
		renderResult = [renderResult];
	}

	return renderResult;
}
