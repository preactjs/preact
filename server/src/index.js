const NO_RENDER = { render: false };

const ESC = {
	'<': '&lt;',
	'>': '&gt;',
	'"': '&quot;',
	'&': '&amp;'
};

const EMPTY = {};

const HOP = Object.prototype.hasOwnProperty;

let escape = s => String(s).replace(/[<>"&]/, a => ESC[a] || a);

/** Convert JSX to a string, rendering out all nested components along the way.
 *	@param {VNode} vnode		A VNode, generally created via JSX
 *	@param {Object} [options]	Options for the renderer
 *	@param {Boolean} [options.shallow=false]	Passing `true` stops at Component VNodes without rendering them. Note: a component located at the root will always be rendered.
 */
export function render(vnode, opts) {
	return internalRender(vnode, opts || EMPTY, true);
}

export function shallowRender(vnode, opts) {
	return internalRender(vnode, { shallow:true, ...(opts || EMPTY) }, true);
}

export default render;


function internalRender(vnode, opts, root) {
	let { nodeName, attributes, children } = vnode || EMPTY;

	// #text nodes
	if (!nodeName) {
		return escape(vnode);
	}

	// components
	if (typeof nodeName==='function') {
		if (opts.shallow===true && !root) {
			nodeName = getComponentName(nodeName);
		}
		else {
			let props = { children, ...attributes },
				rendered;

			if (typeof nodeName.prototype.render!=='function') {
				// stateless functional components
				rendered = nodeName(props);
			}
			else {
				// class-based components
				let c = new nodeName(props);
				c.setProps(props, NO_RENDER);
				rendered = c.render(c.props = props, c.state);
			}

			return internalRender(rendered, opts, false);
		}
	}

	// render JSX to HTML
	let s = `<${nodeName}`;
	for (let name in attributes) {
		if (HOP.call(attributes, name)) {
			let v = attributes[name];
			if (name==='className') {
				if (attributes['class']) continue;
				name = 'class';
			}
			if (v!==null && v!==undefined) {
				s += ` ${name}="${escape(v)}"`;
			}
		}
	}
	s += '>';
	if (children && children.length) {
		s += children.map( child => internalRender(child, opts, false) ).join('');
	}
	s += `</${nodeName}>`
	return s;
}

function getComponentName(component) {
	return component.displayName || component.name || component.prototype.displayName || component.prototype.name || (Function.prototype.toString.call(component).match(/\s([^\(]+)/) || EMPTY)[1] || 'Component';
}
