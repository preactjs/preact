
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

let indent = (s, char) => String(s).replace(/(\n+)/g, '$1' + (char || '\t'));

let isLargeString = s => (String(s).length>40 || String(s).indexOf('\n')!==-1 || String(s).indexOf('<')!==-1);

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
renderToString.shallowRender = (vnode, context) => renderToString(vnode, context, SHALLOW);


/** You can actually skip preact entirely and import this empty Component base class (or not use a base class at all).
 *	preact-render-to-string doesn't use any of Preact's functionality to do its job.
 *	@name Component
 *	@class
 */
// renderToString.Component = function Component(){};


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
			let props = { children, ...attributes },
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
				rendered = c.render(c.props, c.state, c.context);

				if (c.getChildContext) {
					context = c.getChildContext();
				}
			}

			return renderToString(rendered, context, opts, opts.shallowHighOrder!==false);
		}
	}

	// render JSX to HTML
	let s = `<${nodeName}`,
		html;

	if (attributes) {
		let attrs = objectKeys(attributes);

		// allow sorting lexicographically for more determinism (useful for tests, such as via preact-jsx-chai)
		if (opts && opts.sortAttributes===true) attrs.sort();

		for (let i=0; i<attrs.length; i++) {
			let name = attrs[i],
				v = attributes[name];
			if (name==='className') {
				if (attributes['class']) continue;
				name = 'class';
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

	s += '>';

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
				hasLarge = false;
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
