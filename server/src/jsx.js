import './polyfills';
import renderToString from './pretty';
import { indent, encodeEntities } from './util';
import prettyFormat from 'pretty-format';

/** @typedef {import('preact').VNode} VNode */

// we have to patch in Array support, Possible issue in npm.im/pretty-format
let preactPlugin = {
	test(object) {
		return (
			object &&
			typeof object === 'object' &&
			'type' in object &&
			'props' in object &&
			'key' in object
		);
	},
	print(val, print, indent) {
		return renderToString(val, preactPlugin.context, preactPlugin.opts, true);
	}
};

let prettyFormatOpts = {
	plugins: [preactPlugin]
};

function attributeHook(name, value, context, opts, isComponent) {
	let type = typeof value;

	// Use render-to-string's built-in handling for these properties
	if (name === 'dangerouslySetInnerHTML') return false;

	// always skip null & undefined values, skip false DOM attributes, skip functions if told to
	if (value == null || (type === 'function' && !opts.functions)) return '';

	if (
		opts.skipFalseAttributes &&
		!isComponent &&
		(value === false ||
			((name === 'class' || name === 'style') && value === ''))
	)
		return '';

	let indentChar = typeof opts.pretty === 'string' ? opts.pretty : '\t';
	if (type !== 'string') {
		if (type === 'function' && !opts.functionNames) {
			value = 'Function';
		} else {
			preactPlugin.context = context;
			preactPlugin.opts = opts;
			value = prettyFormat(value, prettyFormatOpts);
			if (~value.indexOf('\n')) {
				value = `${indent('\n' + value, indentChar)}\n`;
			}
		}
		return indent(`\n${name}={${value}}`, indentChar);
	}
	return `\n${indentChar}${name}="${encodeEntities(value)}"`;
}

let defaultOpts = {
	attributeHook,
	jsx: true,
	xml: false,
	functions: true,
	functionNames: true,
	skipFalseAttributes: true,
	pretty: '  '
};

/**
 * Render Preact JSX + Components to a pretty-printed HTML-like string.
 * @param {VNode} vnode	JSX Element / VNode to render
 * @param {Object} [context={}] Initial root context object
 * @param {Object} [options={}] Rendering options
 * @param {Boolean} [options.jsx=true] Generate JSX/XML output instead of HTML
 * @param {Boolean} [options.xml=false] Use self-closing tags for elements without children
 * @param {Boolean} [options.shallow=false] Serialize nested Components (`<Foo a="b" />`) instead of rendering
 * @param {Boolean} [options.pretty=false] Add whitespace for readability
 * @param {RegExp|undefined} [options.voidElements] RegeEx to define which element types are self-closing
 * @returns {String} a pretty-printed HTML-like string
 */
export default function renderToStringPretty(vnode, context, options) {
	const opts = Object.assign({}, defaultOpts, options || {});
	if (!opts.jsx) opts.attributeHook = null;
	return renderToString(vnode, context, opts);
}
export { renderToStringPretty as render };

const SHALLOW = { shallow: true };

/** Only render elements, leaving Components inline as `<ComponentName ... />`.
 *	This method is just a convenience alias for `render(vnode, context, { shallow:true })`
 *	@name shallow
 *	@function
 *	@param {VNode} vnode	JSX VNode to render.
 *	@param {Object} [context={}]	Optionally pass an initial context object through the render path.
 *	@param {Parameters<typeof renderToStringPretty>[2]} [options]	Optionally pass an initial context object through the render path.
 */
export function shallowRender(vnode, context, options) {
	const opts = Object.assign({}, SHALLOW, options || {});
	return renderToStringPretty(vnode, context, opts);
}
