import { render as preactRender, cloneElement as preactCloneElement, createRef, createElement as h, Component, options, toChildArray } from 'ceviche';

const version = '15.1.0'; // trick libraries to think we are react

const REACT_ELEMENT_TYPE = (typeof Symbol!=='undefined' && Symbol.for && Symbol.for('react.element')) || 0xeac7;

const COMPONENT_WRAPPER_KEY = (typeof Symbol!=='undefined' && Symbol.for) ? Symbol.for('__preactCompatWrapper') : '__preactCompatWrapper';

const CAMEL_PROPS = /^(?:accent|alignment|arabic|baseline|cap|clip|color|fill|flood|font|glyph|horiz|marker|overline|paint|stop|strikethrough|stroke|text|underline|unicode|units|v|vector|vert|word|writing|x)[A-Z]/;

// a component that renders nothing. Used to replace components for unmountComponentAtNode.
function EmptyComponent() { return null; }

let oldEventHook = options.event;
options.event = e => {
	if (oldEventHook) e = oldEventHook(e);
	e.persist = Object;
	e.nativeEvent = e;
	return e;
};

let oldVnodeHook = options.vnode;
options.vnode = vnode => {
	if (!vnode.preactCompatUpgraded) {
		vnode.preactCompatUpgraded = true;

		let tag = vnode.type,
			attrs = vnode.props = vnode.props==null ? {} : extend({}, vnode.props);

		if (typeof tag==='function') {
			if ((tag[COMPONENT_WRAPPER_KEY]===true || (tag.prototype && 'isReactComponent' in tag.prototype)) && !vnode.preactCompatNormalized) {
				normalizeVNode(vnode);
			}
		}
		else {
			if (attrs.defaultValue) {
				if (!attrs.value && attrs.value!==0) {
					attrs.value = attrs.defaultValue;
				}
				delete attrs.defaultValue;
			}

			handleElementVNode(vnode, attrs);
		}
	}

	if (oldVnodeHook) oldVnodeHook(vnode);
};

function handleElementVNode(vnode, a) {
	let shouldSanitize, attrs, i;
	if (a) {
		for (i in a) if ((shouldSanitize = CAMEL_PROPS.test(i))) break;
		if (shouldSanitize) {
			attrs = vnode.props = {};
			for (i in a) {
				if (a.hasOwnProperty(i)) {
					attrs[ CAMEL_PROPS.test(i) ? i.replace(/([A-Z0-9])/, '-$1').toLowerCase() : i ] = a[i];
				}
			}
		}
	}
}

// proxy render() since React returns a Component reference.
function render(vnode, parent, callback) {
	preactRender(vnode, parent);
	if (typeof callback==='function') callback();

	return vnode!=null ? vnode._component : null;
}

class ContextProvider {
	getChildContext() {
		return this.props.context;
	}
	render(props) {
		return props.children;
	}
}

function renderSubtreeIntoContainer(parentComponent, vnode, container, callback) {
	let wrap = h(ContextProvider, { context: parentComponent.context }, vnode);
	let rendered = render(wrap, container);
	let c = rendered.props.children._component;
	if (callback) callback.call(c, rendered);
	return c;
}

function Portal(props) {
	renderSubtreeIntoContainer(this, props.vnode, props.container);
}

function createPortal(vnode, container) {
	return h(Portal, { vnode, container });
}


function unmountComponentAtNode(container) {
	let existing = container._preactCompatRendered && container._preactCompatRendered.base;
	if (existing && existing.parentNode===container) {
		preactRender(h(EmptyComponent), container, existing);
		return true;
	}
	return false;
}

const mapFn = (children, fn, ctx) => {
	if (children == null) return null;
	children = toChildArray(children);
	if (ctx && ctx!==children) fn = fn.bind(ctx);
	return children.map(fn);
};

// This API is completely unnecessary for Preact, so it's basically passthrough.
let Children = {
	map: mapFn,
	forEach: mapFn,
	count(children) {
		return children ? toChildArray(children).length : 0;
	},
	only(children) {
		children = toChildArray(children);
		if (children.length!==1) throw new Error('Children.only() expects only one child.');
		return children[0];
	},
	toArray: toChildArray
};

function upgradeToVNodes(arr, offset) {
	for (let i=offset || 0; i<arr.length; i++) {
		let obj = arr[i];
		if (Array.isArray(obj)) {
			upgradeToVNodes(obj);
		}
		else if (obj && typeof obj==='object' && !isValidElement(obj) && ((obj.props && obj.type) || obj.props || obj.children)) {
			arr[i] = createElement(obj.type, obj.props, obj.children);
		}
	}
}

function createElement(...args) {
	upgradeToVNodes(args, 2);
	let vnode = h(...args);
	vnode.$$typeof = REACT_ELEMENT_TYPE;
	vnode.preactCompatUpgraded = false;
	vnode.preactCompatNormalized = false;
	return normalizeVNode(vnode);
}

function normalizeVNode(vnode) {
	vnode.preactCompatNormalized = true;
	applyClassName(vnode);
	applyEventNormalization(vnode);
	return vnode;
}

function cloneElement(element) {
	if (!isValidElement(element)) return element;
	return normalizeVNode(preactCloneElement.apply(null, arguments));
}

function isValidElement(element) {
	return element && element.$$typeof===REACT_ELEMENT_TYPE;
}

function applyEventNormalization({ type, props }) {
	if (!props || typeof type!=='string') return;
	let newProps = {};
	for (let i in props) {
		newProps[i.toLowerCase()] = i;
	}
	if (newProps.ondoubleclick) {
		props.ondblclick = props[newProps.ondoubleclick];
		delete props[newProps.ondoubleclick];
	}
	// for *textual inputs* (incl textarea), normalize `onChange` -> `onInput`:
	if (newProps.onchange && (type==='textarea' || (type.toLowerCase()==='input' && !/^fil|che|rad/i.test(props.type)))) {
		let normalized = newProps.oninput || 'oninput';
		if (!props[normalized]) {
			props[normalized] = props[newProps.onchange];
			delete props[newProps.onchange];
		}
	}
}

function applyClassName(vnode) {
	let a = vnode.props || (vnode.props = {});
	classNameDescriptor.enumerable = 'className' in a;
	if (a.className) a.class = a.className;
	Object.defineProperty(a, 'className', classNameDescriptor);
}

let classNameDescriptor = {
	configurable: true,
	get() { return this.class; },
	set(v) { this.class = v; }
};

function extend(base, props) {
	for (let i=1, obj; i<arguments.length; i++) {
		if ((obj = arguments[i])) {
			for (let key in obj) {
				if (obj.hasOwnProperty(key)) {
					base[key] = obj[key];
				}
			}
		}
	}
	return base;
}

function shallowDiffers(a, b) {
	for (let i in a) if (!(i in b)) return true;
	for (let i in b) if (a[i]!==b[i]) return true;
	return false;
}

function findDOMNode(component) {
	return component && (component.base || component.nodeType === 1 && component) || null;
}

function PureComponent(props, context) {
	Component.call(this, props, context);
}
PureComponent.prototype = Object.create(Component.prototype);
PureComponent.prototype.isPureReactComponent = true;
PureComponent.prototype.shouldComponentUpdate = function(props, state) {
	return shallowDiffers(this.props, props) || shallowDiffers(this.state, state);
};

// eslint-disable-next-line camelcase
function unstable_batchedUpdates(callback) {
	callback();
}

export {
	version,
	Children,
	render,
	render as hydrate,
	createPortal,
	createElement,
	cloneElement,
	createRef,
	isValidElement,
	findDOMNode,
	unmountComponentAtNode,
	Component,
	PureComponent,
	// eslint-disable-next-line camelcase
	renderSubtreeIntoContainer as unstable_renderSubtreeIntoContainer,
	// eslint-disable-next-line camelcase
	unstable_batchedUpdates,
	extend as __spread
};

export default {
	version,
	Children,
	render,
	hydrate: render,
	createPortal,
	createElement,
	cloneElement,
	createRef,
	isValidElement,
	findDOMNode,
	unmountComponentAtNode,
	Component,
	PureComponent,
	unstable_renderSubtreeIntoContainer: renderSubtreeIntoContainer,
	unstable_batchedUpdates,
	__spread: extend
};
