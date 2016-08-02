import prettyFormat from 'pretty-format';

const SHALLOW = { shallow: true };

const ESC = {
	'<': '&lt;',
	'>': '&gt;',
	'"': '&quot;',
	'&': '&amp;'
};

const EMPTY = {};

const VOID_ELEMENTS = [
	'area',
	'base',
	'br',
	'col',
	'embed',
	'hr',
	'img',
	'input',
	'link',
	'meta',
	'param',
	'source',
	'track',
	'wbr'
];

// DOM properties that should NOT have "px" added when numeric
export const NON_DIMENSION_PROPS = {
	boxFlex:1, boxFlexGroup:1, columnCount:1, fillOpacity:1, flex:1, flexGrow:1,
	flexPositive:1, flexShrink:1, flexNegative:1, fontWeight:1, lineClamp:1, lineHeight:1,
	opacity:1, order:1, orphans:1, strokeOpacity:1, widows:1, zIndex:1, zoom:1
};

// components without names, kept as a hash for later comparison to return consistent UnnamedComponentXX names.
const UNNAMED = [];

const objectKeys = Object.keys || (obj => {
	let keys = [];
	for (let i in obj) if (obj.hasOwnProperty(i)) keys.push(i);
	return keys;
});

let encodeEntities = s => String(s).replace(/[<>"&]/g, escapeChar);

let escapeChar = a => ESC[a] || a;

let falsey = v => v==null || v===false;

let memoize = (fn, mem={}) => v => mem[v] || (mem[v] = fn(v));

let indent = (s, char) => String(s).replace(/(\n+)/g, '$1' + (char || '\t'));

let isLargeString = (s, length, ignoreLines) => (String(s).length>(length || 40) || (!ignoreLines && String(s).indexOf('\n')!==-1) || String(s).indexOf('<')!==-1);

function styleObjToCss(s) {
	let str = '';
	for (let prop in s) {
		let val = s[prop];
		if (val!=null) {
			if (str) str += ' ';
			str += jsToCss(prop);
			str += ': ';
			str += val;
			if (typeof val==='number' && !NON_DIMENSION_PROPS[prop]) {
				str += 'px';
			}
			str += ';';
		}
	}
	return str;
}

// Convert a JavaScript camel-case CSS property name to a CSS property name
let jsToCss = memoize( s => s.replace(/([A-Z])/g,'-$1').toLowerCase() );

function assign(obj, props) {
	for (let i in props) obj[i] = props[i];
	return obj;
}

function getNodeProps(vnode) {
	let defaultProps = vnode.nodeName.defaultProps,
		props = assign({}, defaultProps || vnode.attributes);
	if (defaultProps) assign(props, vnode.attributes);
	if (vnode.children) props.children = vnode.children;
	return props;
}

// we have to patch in Array support, Possible issue in npm.im/pretty-format
let preactPlugin = {
	test(object) {
		return object && typeof object==='object' && 'nodeName' in object && 'attributes' in object && 'children' in object && !('nodeType' in object);
	},
	print(val, print, indent) {
		return renderToString(val, preactPlugin.context, preactPlugin.opts, true);
	}
};

let prettyFormatOpts = {
	plugins: [preactPlugin]
};

/** Render Preact JSX + Components to an HTML string.
 *	@name render
 *	@function
 *	@param {VNode} vnode	JSX VNode to render.
 *	@param {Object} [context={}]	Optionally pass an initial context object through the render path.
 *	@param {Object} [options={}]	Rendering options
 *	@param {Boolean} [options.shallow=false]	If `true`, renders nested Components as HTML elements (`<Foo a="b" />`).
 *	@param {Boolean} [options.xml=false]		If `true`, uses self-closing tags for elements without children.
 *	@param {Boolean} [options.pretty=false]		If `true`, adds whitespace for readability
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


/** The default export is an alias of `render()`. */
export default function renderToString(vnode, context, opts, inner) {
	let { nodeName, attributes, children } = vnode || EMPTY;
	context = context || {};
	opts = opts || {};

	let pretty = opts.pretty,
		indentChar = typeof pretty==='string' ? pretty : '\t';

	// #text nodes
	if (!nodeName) {
		return encodeEntities(vnode);
	}

	// components
	if (typeof nodeName==='function') {
		if (opts.shallow && (inner || opts.renderRootComponent===false)) {
			nodeName = getComponentName(nodeName);
		}
		else {
			let props = getNodeProps(vnode),
				rendered;

			if (!nodeName.prototype || typeof nodeName.prototype.render!=='function') {
				// stateless functional components
				rendered = nodeName(props, context);
			}
			else {
				// class-based components
				let c = new nodeName(props, context);
				c.props = props;
				c.context = context;
				if (c.componentWillMount) c.componentWillMount();
				rendered = c.render(c.props, c.state, c.context);

				if (c.getChildContext) {
					context = assign(assign({}, context), c.getChildContext());
				}
			}

			return renderToString(rendered, context, opts, opts.shallowHighOrder!==false);
		}
	}

	// render JSX to HTML
	let s = '', html;

	if (attributes) {
		let attrs = objectKeys(attributes);

		// allow sorting lexicographically for more determinism (useful for tests, such as via preact-jsx-chai)
		if (opts && opts.sortAttributes===true) attrs.sort();

		for (let i=0; i<attrs.length; i++) {
			let name = attrs[i],
				v = attributes[name];
			if (name==='children') continue;
			if (!(opts && opts.allAttributes) && (name==='key' || name==='ref')) continue;

			if (opts.jsx) {
				if (typeof v!=='string') {
					preactPlugin.context = context;
					preactPlugin.opts = opts;
					v = prettyFormat(v, prettyFormatOpts);
					if (~v.indexOf('\n')) {
						v = `${indent('\n'+v, indentChar)}\n`;
					}
					s += indent(`\n${name}={${v}}`, indentChar);
				}
				else {
					s += `\n${indentChar}${name}="${encodeEntities(v)}"`;
				}
				continue;
			}

			if (name==='className') {
				if (attributes['class']) continue;
				name = 'class';
			}
			if (name==='style' && v && typeof v==='object') {
				v = styleObjToCss(v);
			}

			if (name==='dangerouslySetInnerHTML') {
				html = v && v.__html;
			}
			else if ((v || v===0) && typeof v!=='function') {
				if (v===true) {
					v = name;
					// in non-xml mode, allow boolean attributes
					if (!opts || !opts.xml) {
						s += ' ' + name;
						continue;
					}
				}
				s += ` ${name}="${encodeEntities(v)}"`;
			}
		}
	}

	// account for >1 multiline attribute
	let sub = s.replace(/^\n\s*/, ' ');
	if (sub!==s && !~sub.indexOf('\n')) s = sub;
	else if (~s.indexOf('\n')) s += '\n';

	s = `<${nodeName}${s}>`;

	if (html) {
		// if multiline, indent.
		if (pretty && isLargeString(html)) {
			html = '\n' + indentChar + indent(html, indentChar);
		}
		s += html;
	}
	else {
		let len = children && children.length;
		if (len) {
			let pieces = [],
				hasLarge = ~s.indexOf('\n');
			for (let i=0; i<len; i++) {
				let child = children[i];
				if (!falsey(child)) {
					let ret = renderToString(child, context, opts, true);
					if (!hasLarge && pretty && isLargeString(ret)) hasLarge = true;
					pieces.push(ret);
				}
			}
			if (hasLarge) {
				for (let i=pieces.length; i--; ) {
					pieces[i] = '\n' + indentChar + indent(pieces[i], indentChar);
				}
			}
			s += pieces.join('');
		}
		else if (opts && opts.xml) {
			return s.substring(0, s.length-1) + ' />';
		}
	}

	if (VOID_ELEMENTS.indexOf(nodeName) === -1) {
		if (pretty && ~s.indexOf('\n')) s += '\n';
		s += `</${nodeName}>`;
	}

	return s;
}

function getComponentName(component) {
	let proto = component.prototype,
		ctor = proto && proto.constructor;
	return component.displayName || component.name || (proto && (proto.displayName || proto.name)) || getFallbackComponentName(component);
}

function getFallbackComponentName(component) {
	let str = Function.prototype.toString.call(component),
		name = (str.match(/^\s*function\s+([^\( ]+)/) || EMPTY)[1];
	if (!name) {
		// search for an existing indexed name for the given component:
		let index = -1;
		for (let i=UNNAMED.length; i--; ) {
			if (UNNAMED[i]===component) {
				index = i;
				break;
			}
		}
		// not found, create a new indexed name:
		if (index<0) {
			index = UNNAMED.push(component) - 1;
		}
		name = `UnnamedComponent${index}`;
	}
	return name;
}
renderToString.shallowRender = shallowRender;


export {
	renderToString as render,
	renderToString,
	shallowRender
};
