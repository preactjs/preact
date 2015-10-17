const NO_RENDER = { render: false };

const ESC = {
	'<': '&lt;',
	'>': '&gt;',
	'"': '&quot;',
	'&': '&amp;'
};

const HOP = Object.prototype.hasOwnProperty;

let escape = s => String(s).replace(/[<>"&]/, a => ESC[a] || a);

export default function renderToString(vnode) {
	let { nodeName, attributes, children } = vnode || EMPTY;

	// #text nodes
	if (!nodeName) {
		return escape(vnode);
	}

	// components
	if (typeof nodeName==='function') {
		let props = { children },
			rendered;
		for (let i in attributes) if (HOP.call(attributes, i)) {
			props[i] = attributes[i];
		}

		if (typeof nodeName.prototype.render!=='function') {
			// stateless functional components
			rendered = nodeName(props);
		}
		else {
			// class-based components
			let c = new nodeName();
			c.setProps(props, NO_RENDER);
			rendered = c.render(c.props = props, c.state);
		}
		return renderToString(rendered);
	}

	// render JSX to HTML
	let s = `<${nodeName}`;
	for (let name in attributes) if (HOP.call(attributes, name)) {
		s += ` ${name}="${escape(attributes[name])}"`;
	}
	if (children && children.length) {
		s += `>${children.map(renderToString).join('')}</${nodeName}>`;
	}
	else {
		s += ' />';
	}
	return s;
};
