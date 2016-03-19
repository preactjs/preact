
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

const HOP = Object.prototype.hasOwnProperty;

let encodeEntities = s => String(s).replace(/[<>"&]/g, escapeChar);

let escapeChar = a => ESC[a] || a;

let falsey = v => v==null || v===false;


/** Render Preact JSX + Components to an HTML string.
 *	@name render
 *	@function
 *	@param {VNode} vnode	JSX VNode to render.
 *	@param {Object} [options={}]	Rendering options
 *	@param {Boolean} [options.shallow=false]	If `true`, renders nested Components as HTML elements (`<Foo a="b" />`).
 *	@param {Boolean} [options.xml=false]		If `true`, uses self-closing tags for elements without children.
 *	@param {Object} [context={}]	Optionally pass an initial context object through the render path.
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

	// #text nodes
	if (!nodeName) {
		return encodeEntities(vnode);
	}

	// components
	if (typeof nodeName==='function') {
		if (opts && opts.shallow && inner) {
			nodeName = getComponentName(nodeName);
		}
		else {
			let props = { children, ...attributes },
				rendered;

			if (typeof nodeName.prototype.render!=='function') {
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

			return renderToString(rendered, context, opts, !opts || opts.shallowHighOrder!==false);
		}
	}

	// render JSX to HTML
	let s = `<${nodeName}`,
		html;

	for (let name in attributes) {
		if (HOP.call(attributes, name)) {
			let v = attributes[name];
			if (name==='className') {
				if (attributes['class']) continue;
				name = 'class';
			}
			if (name==='dangerouslySetInnerHTML') {
				html = v && v.__html;
			}
			else if (!falsey(v) && typeof v!=='function') {
				s += ` ${name}="${encodeEntities(v)}"`;
			}
		}
	}
	s += '>';

	if (html) {
		s += html;
	}
	else {
		let len = children && children.length;
		if (len) {
			for (let i=0; i<len; i++) {
				let child = children[i];
				if (!falsey(child)) {
					s += renderToString(child, context, opts, true);
				}
			}
		}
		else if (opts && opts.xml) {
			return s.substring(0, s.length-1) + ' />';
		}
	}

	if (VOID_ELEMENTS.indexOf(nodeName) === -1) {
		s += `</${nodeName}>`;
	}

	return s;
};

function getComponentName(component) {
	return component.displayName || component.name || component.prototype.displayName || component.prototype.name || (Function.prototype.toString.call(component).match(/\s([^\(]+)/) || EMPTY)[1] || 'Component';
}
