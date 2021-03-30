import {
	encodeEntities,
	indent,
	isLargeString,
	styleObjToCss,
	assign,
	getChildren
} from './util';
import { options, Fragment } from 'preact';

/** @typedef {import('preact').VNode} VNode */

const SHALLOW = { shallow: true };

// components without names, kept as a hash for later comparison to return consistent UnnamedComponentXX names.
const UNNAMED = [];

const VOID_ELEMENTS = /^(area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)$/;

const UNSAFE_NAME = /[\s\n\\/='"\0<>]/;

const noop = () => {};

/** Render Preact JSX + Components to an HTML string.
 *	@name render
 *	@function
 *	@param {VNode} vnode	JSX VNode to render.
 *	@param {Object} [context={}]	Optionally pass an initial context object through the render path.
 *	@param {Object} [options={}]	Rendering options
 *	@param {Boolean} [options.shallow=false]	If `true`, renders nested Components as HTML elements (`<Foo a="b" />`).
 *	@param {Boolean} [options.xml=false]		If `true`, uses self-closing tags for elements without children.
 *	@param {Boolean} [options.pretty=false]		If `true`, adds whitespace for readability
 *	@param {RegExp|undefined} [options.voidElements]       RegeEx that matches elements that are considered void (self-closing)
 */
renderToString.render = renderToString;

/** Only render elements, leaving Components inline as `<ComponentName ... />`.
 *	This method is just a convenience alias for `render(vnode, context, { shallow:true })`
 *	@name shallow
 *	@function
 *	@param {VNode} vnode	JSX VNode to render.
 *	@param {Object} [context={}]	Optionally pass an initial context object through the render path.
 */
let shallowRender = (vnode, context) => renderToString(vnode, context, SHALLOW);

const EMPTY_ARR = [];
function renderToString(vnode, context, opts) {
	context = context || {};
	opts = opts || {};

	// Performance optimization: `renderToString` is synchronous and we
	// therefore don't execute any effects. To do that we pass an empty
	// array to `options._commit` (`__c`). But we can go one step further
	// and avoid a lot of dirty checks and allocations by setting
	// `options._skipEffects` (`__s`) too.
	const previousSkipEffects = options.__s;
	options.__s = true;

	const res = _renderToString(vnode, context, opts);

	// options._commit, we don't schedule any effects in this library right now,
	// so we can pass an empty queue to this hook.
	if (options.__c) options.__c(vnode, EMPTY_ARR);
	EMPTY_ARR.length = 0;
	options.__s = previousSkipEffects;
	return res;
}

/** The default export is an alias of `render()`. */
function _renderToString(vnode, context, opts, inner, isSvgMode, selectValue) {
	if (vnode == null || typeof vnode === 'boolean') {
		return '';
	}

	// #text nodes
	if (typeof vnode !== 'object') {
		return encodeEntities(vnode);
	}

	let pretty = opts.pretty,
		indentChar = pretty && typeof pretty === 'string' ? pretty : '\t';

	if (Array.isArray(vnode)) {
		let rendered = '';
		for (let i = 0; i < vnode.length; i++) {
			if (pretty && i > 0) rendered += '\n';
			rendered += _renderToString(
				vnode[i],
				context,
				opts,
				inner,
				isSvgMode,
				selectValue
			);
		}
		return rendered;
	}

	let nodeName = vnode.type,
		props = vnode.props,
		isComponent = false;

	// components
	if (typeof nodeName === 'function') {
		isComponent = true;
		if (opts.shallow && (inner || opts.renderRootComponent === false)) {
			nodeName = getComponentName(nodeName);
		} else if (nodeName === Fragment) {
			const children = [];
			getChildren(children, vnode.props.children);
			return _renderToString(
				children,
				context,
				opts,
				opts.shallowHighOrder !== false,
				isSvgMode,
				selectValue
			);
		} else {
			let rendered;

			let c = (vnode.__c = {
				__v: vnode,
				context,
				props: vnode.props,
				// silently drop state updates
				setState: noop,
				forceUpdate: noop,
				// hooks
				__h: []
			});

			// options._diff
			if (options.__b) options.__b(vnode);

			// options._render
			if (options.__r) options.__r(vnode);

			if (
				!nodeName.prototype ||
				typeof nodeName.prototype.render !== 'function'
			) {
				// Necessary for createContext api. Setting this property will pass
				// the context value as `this.context` just for this component.
				let cxType = nodeName.contextType;
				let provider = cxType && context[cxType.__c];
				let cctx =
					cxType != null
						? provider
							? provider.props.value
							: cxType.__
						: context;

				// stateless functional components
				rendered = nodeName.call(vnode.__c, props, cctx);
			} else {
				// class-based components
				let cxType = nodeName.contextType;
				let provider = cxType && context[cxType.__c];
				let cctx =
					cxType != null
						? provider
							? provider.props.value
							: cxType.__
						: context;

				// c = new nodeName(props, context);
				c = vnode.__c = new nodeName(props, cctx);
				c.__v = vnode;
				// turn off stateful re-rendering:
				c._dirty = c.__d = true;
				c.props = props;
				if (c.state == null) c.state = {};

				if (c._nextState == null && c.__s == null) {
					c._nextState = c.__s = c.state;
				}

				c.context = cctx;
				if (nodeName.getDerivedStateFromProps)
					c.state = assign(
						assign({}, c.state),
						nodeName.getDerivedStateFromProps(c.props, c.state)
					);
				else if (c.componentWillMount) {
					c.componentWillMount();

					// If the user called setState in cWM we need to flush pending,
					// state updates. This is the same behaviour in React.
					c.state =
						c._nextState !== c.state
							? c._nextState
							: c.__s !== c.state
							? c.__s
							: c.state;
				}

				rendered = c.render(c.props, c.state, c.context);
			}

			if (c.getChildContext) {
				context = assign(assign({}, context), c.getChildContext());
			}

			if (options.diffed) options.diffed(vnode);
			return _renderToString(
				rendered,
				context,
				opts,
				opts.shallowHighOrder !== false,
				isSvgMode,
				selectValue
			);
		}
	}

	// render JSX to HTML
	let s = '<' + nodeName,
		propChildren,
		html;

	if (props) {
		let attrs = Object.keys(props);

		// allow sorting lexicographically for more determinism (useful for tests, such as via preact-jsx-chai)
		if (opts && opts.sortAttributes === true) attrs.sort();

		for (let i = 0; i < attrs.length; i++) {
			let name = attrs[i],
				v = props[name];
			if (name === 'children') {
				propChildren = v;
				continue;
			}

			if (UNSAFE_NAME.test(name)) continue;

			if (
				!(opts && opts.allAttributes) &&
				(name === 'key' ||
					name === 'ref' ||
					name === '__self' ||
					name === '__source' ||
					name === 'defaultValue')
			)
				continue;

			if (name === 'className') {
				if (props.class) continue;
				name = 'class';
			} else if (isSvgMode && name.match(/^xlink:?./)) {
				name = name.toLowerCase().replace(/^xlink:?/, 'xlink:');
			}

			if (name === 'htmlFor') {
				if (props.for) continue;
				name = 'for';
			}

			if (name === 'style' && v && typeof v === 'object') {
				v = styleObjToCss(v);
			}

			// always use string values instead of booleans for aria attributes
			// also see https://github.com/preactjs/preact/pull/2347/files
			if (name[0] === 'a' && name['1'] === 'r' && typeof v === 'boolean') {
				v = String(v);
			}

			let hooked =
				opts.attributeHook &&
				opts.attributeHook(name, v, context, opts, isComponent);
			if (hooked || hooked === '') {
				s += hooked;
				continue;
			}

			if (name === 'dangerouslySetInnerHTML') {
				html = v && v.__html;
			} else if (nodeName === 'textarea' && name === 'value') {
				// <textarea value="a&b"> --> <textarea>a&amp;b</textarea>
				propChildren = v;
			} else if ((v || v === 0 || v === '') && typeof v !== 'function') {
				if (v === true || v === '') {
					v = name;
					// in non-xml mode, allow boolean attributes
					if (!opts || !opts.xml) {
						s += ' ' + name;
						continue;
					}
				}

				if (name === 'value') {
					if (nodeName === 'select') {
						selectValue = v;
						continue;
					} else if (nodeName === 'option' && selectValue == v) {
						s += ` selected`;
					}
				}
				s += ` ${name}="${encodeEntities(v)}"`;
			}
		}
	}

	// account for >1 multiline attribute
	if (pretty) {
		let sub = s.replace(/\n\s*/, ' ');
		if (sub !== s && !~sub.indexOf('\n')) s = sub;
		else if (pretty && ~s.indexOf('\n')) s += '\n';
	}

	s += '>';

	if (UNSAFE_NAME.test(nodeName))
		throw new Error(`${nodeName} is not a valid HTML tag name in ${s}`);

	let isVoid =
		VOID_ELEMENTS.test(nodeName) ||
		(opts.voidElements && opts.voidElements.test(nodeName));
	let pieces = [];

	let children;
	if (html) {
		// if multiline, indent.
		if (pretty && isLargeString(html)) {
			html = '\n' + indentChar + indent(html, indentChar);
		}
		s += html;
	} else if (
		propChildren != null &&
		getChildren((children = []), propChildren).length
	) {
		let hasLarge = pretty && ~s.indexOf('\n');
		let lastWasText = false;

		for (let i = 0; i < children.length; i++) {
			let child = children[i];

			if (child != null && child !== false) {
				let childSvgMode =
						nodeName === 'svg'
							? true
							: nodeName === 'foreignObject'
							? false
							: isSvgMode,
					ret = _renderToString(
						child,
						context,
						opts,
						true,
						childSvgMode,
						selectValue
					);

				if (pretty && !hasLarge && isLargeString(ret)) hasLarge = true;

				// Skip if we received an empty string
				if (ret) {
					if (pretty) {
						let isText = ret.length > 0 && ret[0] != '<';

						// We merge adjacent text nodes, otherwise each piece would be printed
						// on a new line.
						if (lastWasText && isText) {
							pieces[pieces.length - 1] += ret;
						} else {
							pieces.push(ret);
						}

						lastWasText = isText;
					} else {
						pieces.push(ret);
					}
				}
			}
		}
		if (pretty && hasLarge) {
			for (let i = pieces.length; i--; ) {
				pieces[i] = '\n' + indentChar + indent(pieces[i], indentChar);
			}
		}
	}

	if (pieces.length || html) {
		s += pieces.join('');
	} else if (opts && opts.xml) {
		return s.substring(0, s.length - 1) + ' />';
	}

	if (isVoid && !children && !html) {
		s = s.replace(/>$/, ' />');
	} else {
		if (pretty && ~s.indexOf('\n')) s += '\n';
		s += `</${nodeName}>`;
	}

	return s;
}

function getComponentName(component) {
	return (
		component.displayName ||
		(component !== Function && component.name) ||
		getFallbackComponentName(component)
	);
}

function getFallbackComponentName(component) {
	let str = Function.prototype.toString.call(component),
		name = (str.match(/^\s*function\s+([^( ]+)/) || '')[1];
	if (!name) {
		// search for an existing indexed name for the given component:
		let index = -1;
		for (let i = UNNAMED.length; i--; ) {
			if (UNNAMED[i] === component) {
				index = i;
				break;
			}
		}
		// not found, create a new indexed name:
		if (index < 0) {
			index = UNNAMED.push(component) - 1;
		}
		name = `UnnamedComponent${index}`;
	}
	return name;
}
renderToString.shallowRender = shallowRender;

export default renderToString;

export {
	renderToString as render,
	renderToString as renderToStaticMarkup,
	renderToString,
	shallowRender
};
