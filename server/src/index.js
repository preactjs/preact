import {
	createInternalFromVnode,
	encodeEntities,
	styleObjToCss,
	UNSAFE_NAME,
	XLINK
} from './util';
import { options, h, Fragment } from 'preact';

import {
	COMMIT,
	COMPONENT,
	DIFF,
	DIFFED,
	NEXT_STATE,
	RENDER,
	SKIP_EFFECTS
} from './constants';
import { DIRTY_BIT } from '../../src/constants';

/** @typedef {import('preact').VNode} VNode */

const EMPTY_ARR = [];
const isArray = Array.isArray;
const assign = Object.assign;

// Global state for the current render pass
let beforeDiff, afterDiff, renderHook;

/**
 * Render Preact JSX + Components to an HTML string.
 * @param {VNode} vnode	JSX Element / VNode to render
 * @param {Object} [context={}] Initial root context object
 * @returns {string} serialized HTML
 */
export default function renderToString(vnode, context) {
	// Performance optimization: `renderToString` is synchronous and we
	// therefore don't execute any effects. To do that we pass an empty
	// array to `options._commit` (`__c`). But we can go one step further
	// and avoid a lot of dirty checks and allocations by setting
	// `options._skipEffects` (`__s`) too.
	const previousSkipEffects = options[SKIP_EFFECTS];
	options[SKIP_EFFECTS] = true;

	// store options hooks once before each synchronous render call
	beforeDiff = options[DIFF];
	afterDiff = options[DIFFED];
	renderHook = options[RENDER];

	try {
		return _renderToString(vnode, context || {}, false, undefined);
	} finally {
		// options._commit, we don't schedule any effects in this library right now,
		// so we can pass an empty queue to this hook.
		if (options[COMMIT]) options[COMMIT](vnode, EMPTY_ARR);
		options[SKIP_EFFECTS] = previousSkipEffects;
		EMPTY_ARR.length = 0;
	}
}

// Installed as setState/forceUpdate for function components
function markAsDirty() {
	this.__i.flags |= DIRTY_BIT;
}

/**
 * @param {VNode} vnode
 * @param {Record<string, unknown>} context
 */
function renderClassComponent(internal, vnode, context) {
	let type =
		/** @type {import("preact").ComponentClass<typeof vnode.props>} */ (vnode.type);

	let c = new type(vnode.props, context);

	internal[COMPONENT] = c;
	c.__i = internal;

	c.props = vnode.props;
	c.context = context;
	internal.flags |= DIRTY_BIT;

	if (c.state == null) c.state = {};

	if (c[NEXT_STATE] == null) {
		c[NEXT_STATE] = c.state;
	}

	if (type.getDerivedStateFromProps) {
		c.state = assign(
			{},
			c.state,
			type.getDerivedStateFromProps(c.props, c.state)
		);
	} else if (c.componentWillMount) {
		c.componentWillMount();

		// If the user called setState in cWM we need to flush pending,
		// state updates. This is the same behaviour in React.
		c.state = c[NEXT_STATE] !== c.state ? c[NEXT_STATE] : c.state;
	}

	if (renderHook) renderHook(internal);

	return c.render(c.props, c.state, context);
}

/**
 * Recursively render VNodes to HTML.
 * @param {VNode|any} vnode
 * @param {any} context
 * @param {boolean} isSvgMode
 * @param {any} selectValue
 * @returns {string}
 */
function _renderToString(vnode, context, isSvgMode, selectValue) {
	// Ignore non-rendered VNodes/values
	if (vnode == null || vnode === true || vnode === false || vnode === '') {
		return '';
	}

	// Text VNodes: escape as HTML
	if (typeof vnode !== 'object') {
		if (typeof vnode === 'function') return '';
		return encodeEntities(vnode + '');
	}

	// Recurse into children / Arrays
	if (isArray(vnode)) {
		let rendered = '';
		for (let i = 0; i < vnode.length; i++) {
			let child = vnode[i];
			if (child == null || typeof child === 'boolean') continue;

			rendered =
				rendered + _renderToString(child, context, isSvgMode, selectValue);

			if (
				typeof child === 'string' ||
				typeof child === 'number' ||
				typeof child === 'bigint'
			) {
				// @ts-ignore manually constructing a Text vnode
				vnode[i] = h(null, null, child);
			}
		}
		return rendered;
	}

	// VNodes have {constructor:undefined} to prevent JSON injection:
	if (vnode.constructor !== undefined) return '';

	const internal = createInternalFromVnode(vnode, context);

	if (beforeDiff) beforeDiff(internal);

	let type = vnode.type,
		props = vnode.props,
		cctx = context,
		contextType,
		rendered,
		component;

	// Invoke rendering on Components
	let isComponent = typeof type === 'function';
	if (isComponent) {
		if (type === Fragment) {
			rendered = props.children;
		} else {
			contextType = type.contextType;
			if (contextType != null) {
				let provider = context[contextType.__c];
				cctx = provider ? provider.props.value : contextType.__;
			}

			if (type.prototype && typeof type.prototype.render === 'function') {
				rendered = /**#__NOINLINE__**/ renderClassComponent(
					internal,
					vnode,
					cctx
				);
				component = internal[COMPONENT];
			} else {
				component = {
					__v: vnode,
					props,
					context: cctx,
					// silently drop state updates
					setState: markAsDirty,
					forceUpdate: markAsDirty,
					__i: internal
				};
				internal[COMPONENT] = component;
				internal.flags |= DIRTY_BIT;

				let count = 0;
				while (internal.flags & DIRTY_BIT && count++ < 25) {
					internal.flags &= ~DIRTY_BIT;

					if (renderHook) renderHook(internal);

					rendered = type.call(component, props, cctx);
				}
				internal.flags |= DIRTY_BIT;
			}

			if (component.getChildContext != null) {
				context = assign({}, context, component.getChildContext());
			}
		}

		// When a component returns a Fragment node we flatten it in core, so we
		// need to mirror that logic here too
		let isTopLevelFragment =
			rendered != null && rendered.type === Fragment && rendered.key == null;
		rendered = isTopLevelFragment ? rendered.props.children : rendered;

		// Recurse into children before invoking the after-diff hook
		const str = _renderToString(rendered, context, isSvgMode, selectValue);

		if (afterDiff) afterDiff(internal);

		if (options.unmount) options.unmount(internal);

		return str;
	}

	// Serialize Element VNodes to HTML
	let s = '<' + type,
		html = '',
		children;

	for (let name in props) {
		let v = props[name];

		switch (name) {
			case 'children':
				children = v;
				continue;

			// VDOM-specific props
			case 'key':
			case 'ref':
			case '__self':
			case '__source':
				continue;

			// prefer for/class over htmlFor/className
			case 'htmlFor':
				if ('for' in props) continue;
				name = 'for';
				break;
			case 'className':
				if ('class' in props) continue;
				name = 'class';
				break;

			// Form element reflected properties
			case 'defaultChecked':
				name = 'checked';
				break;
			case 'defaultSelected':
				name = 'selected';
				break;

			// Special value attribute handling
			case 'defaultValue':
			case 'value':
				name = 'value';
				switch (type) {
					// <textarea value="a&b"> --> <textarea>a&amp;b</textarea>
					case 'textarea':
						children = v;
						continue;

					// <select value> is serialized as a selected attribute on the matching option child
					case 'select':
						selectValue = v;
						continue;

					// Add a selected attribute to <option> if its value matches the parent <select> value
					case 'option':
						if (selectValue == v && !('selected' in props)) {
							s = s + ' selected';
						}
						break;
				}
				break;

			case 'dangerouslySetInnerHTML':
				html = v && v.__html;
				continue;

			// serialize object styles to a CSS string
			case 'style':
				if (typeof v === 'object') {
					v = styleObjToCss(v);
				}
				break;

			default:
				if (isSvgMode && XLINK.test(name)) {
					name = name.toLowerCase().replace(/^xlink:?/, 'xlink:');
				} else if (UNSAFE_NAME.test(name)) {
					continue;
				} else if (name[0] === 'a' && name[1] === 'r' && v != null) {
					// serialize boolean aria-xyz attribute values as strings
					v += '';
				}
		}

		// write this attribute to the buffer
		if (v != null && v !== false && typeof v !== 'function') {
			if (v === true || v === '') {
				s = s + ' ' + name;
			} else {
				s = s + ' ' + name + '="' + encodeEntities(v + '') + '"';
			}
		}
	}

	if (UNSAFE_NAME.test(type)) {
		throw new Error(`${type} is not a valid HTML tag name in ${s}>`);
	}

	if (html) {
		// dangerouslySetInnerHTML defined this node's contents
	} else if (typeof children === 'string') {
		// single text child
		html = encodeEntities(children);
	} else if (children != null && children !== false && children !== true) {
		// recurse into this element VNode's children
		let childSvgMode =
			type === 'svg' || (type !== 'foreignObject' && isSvgMode);
		html = _renderToString(children, context, childSvgMode, selectValue);
	}

	if (afterDiff) afterDiff(internal);
	if (options.unmount) options.unmount(internal);

	// Emit self-closing tag for empty void elements:
	if (!html) {
		switch (type) {
			case 'area':
			case 'base':
			case 'br':
			case 'col':
			case 'embed':
			case 'hr':
			case 'img':
			case 'input':
			case 'link':
			case 'meta':
			case 'param':
			case 'source':
			case 'track':
			case 'wbr':
				return s + ' />';
		}
	}

	return s + '>' + html + '</' + type + '>';
}
