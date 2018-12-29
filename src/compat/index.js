import PropTypes from 'prop-types';
import { render as preactRender, cloneElement as preactCloneElement, createRef, createElement as h, Component as PreactComponent, options, toChildArray } from 'ceviche';

const version = '15.1.0'; // trick libraries to think we are react

const ELEMENTS = 'a abbr address area article aside audio b base bdi bdo big blockquote body br button canvas caption cite code col colgroup data datalist dd del details dfn dialog div dl dt em embed fieldset figcaption figure footer form h1 h2 h3 h4 h5 h6 head header hgroup hr html i iframe img input ins kbd keygen label legend li link main map mark menu menuitem meta meter nav noscript object ol optgroup option output p param picture pre progress q rp rt ruby s samp script section select small source span strong style sub summary sup table tbody td textarea tfoot th thead time title tr track u ul var video wbr circle clipPath defs ellipse g image line linearGradient mask path pattern polygon polyline radialGradient rect stop svg text tspan'.split(' ');

const REACT_ELEMENT_TYPE = (typeof Symbol!=='undefined' && Symbol.for && Symbol.for('react.element')) || 0xeac7;

const COMPONENT_WRAPPER_KEY = (typeof Symbol!=='undefined' && Symbol.for) ? Symbol.for('__preactCompatWrapper') : '__preactCompatWrapper';

// don't autobind these methods since they already have guaranteed context.
const AUTOBIND_BLACKLIST = {
	constructor: 1,
	render: 1,
	shouldComponentUpdate: 1,
	componentWillReceiveProps: 1,
	componentWillUpdate: 1,
	componentDidUpdate: 1,
	componentWillMount: 1,
	componentDidMount: 1,
	componentWillUnmount: 1,
	componentDidUnmount: 1
};

const CAMEL_PROPS = /^(?:accent|alignment|arabic|baseline|cap|clip|color|fill|flood|font|glyph|horiz|marker|overline|paint|stop|strikethrough|stroke|text|underline|unicode|units|v|vector|vert|word|writing|x)[A-Z]/;

const BYPASS_HOOK = {};

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
			if (tag[COMPONENT_WRAPPER_KEY]===true || (tag.prototype && 'isReactComponent' in tag.prototype)) {
				if (!vnode.preactCompatNormalized) {
					normalizeVNode(vnode);
				}
				handleComponentVNode(vnode);
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

function handleComponentVNode(vnode) {
	let tag = vnode.type,
		a = vnode.props;

	vnode.props = {};
	if (tag.defaultProps) extend(vnode.props, tag.defaultProps);
	if (a) extend(vnode.props, a);
}

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
	let prev = parent && parent._preactCompatRendered && parent._preactCompatRendered.base;

	// ignore impossible previous renders
	if (prev && prev.parentNode!==parent) prev = null;

	// default to first Element child
	if (!prev && parent) prev = parent.firstElementChild;

	// remove unaffected siblings
	for (let i=parent.childNodes.length; i--; ) {
		if (parent.childNodes[i]!==prev) {
			parent.removeChild(parent.childNodes[i]);
		}
	}

	preactRender(vnode, parent);

	let out = vnode;
	if (parent) parent._preactCompatRendered = out && (out._component || { base: out });
	if (typeof callback==='function') callback();
	return out && out._component || out;
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


const ARR = [];

// This API is completely unnecessary for Preact, so it's basically passthrough.
let Children = {
	map(children, fn, ctx) {
		if (children == null) return null;
		children = Children.toArray(children);
		if (ctx && ctx!==children) fn = fn.bind(ctx);
		return children.map(fn);
	},
	forEach(children, fn, ctx) {
		if (children == null) return null;
		children = Children.toArray(children);
		if (ctx && ctx!==children) fn = fn.bind(ctx);
		children.forEach(fn);
	},
	count(children) {
		return children && toChildArray(children).length || 0;
	},
	only(children) {
		children = toChildArray(children);
		if (children.length!==1) throw new Error('Children.only() expects only one child.');
		return children[0];
	},
	toArray(children) {
		return toChildArray(children);
	}
};

/** Track current render() component for ref assignment */
let currentComponent;

function createFactory(type) {
	return createElement.bind(null, type);
}

let DOM = {};
for (let i=ELEMENTS.length; i--; ) {
	DOM[ELEMENTS[i]] = createFactory(ELEMENTS[i]);
}

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

	let ref = vnode.props.ref,
		type = ref && typeof ref;
	if (currentComponent && (type==='string' || type==='number')) {
		vnode.props.ref = createStringRefProxy(ref, currentComponent);
	}

	applyEventNormalization(vnode);

	return vnode;
}

function cloneElement(element) {
	if (!isValidElement(element)) return element;
	return preactCloneElement.apply(null, arguments);
}

function isValidElement(element) {
	return element && element.$$typeof===REACT_ELEMENT_TYPE;
}

function createStringRefProxy(name, component) {
	return component._refProxies[name] || (component._refProxies[name] = resolved => {
		if (component && component.refs) {
			component.refs[name] = resolved;
			if (resolved===null) {
				delete component._refProxies[name];
				component = null;
			}
		}
	});
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
			props[normalized] = multihook([props[normalized], props[newProps.onchange]]);
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

function F(){}

function createClass(obj) {
	function cl(props, context) {
		bindAll(this);
		Component.call(this, props, context, BYPASS_HOOK);
		newComponentHook.call(this, props, context);
	}

	obj = extend({ constructor: cl }, obj);

	// We need to apply mixins here so that getDefaultProps is correctly mixed
	if (obj.mixins) {
		applyMixins(obj, collateMixins(obj.mixins));
	}
	if (obj.statics) {
		extend(cl, obj.statics);
	}
	if (obj.propTypes) {
		cl.propTypes = obj.propTypes;
	}
	if (obj.defaultProps) {
		cl.defaultProps = obj.defaultProps;
	}
	if (obj.getDefaultProps) {
		cl.defaultProps = obj.getDefaultProps.call(cl);
	}

	F.prototype = Component.prototype;
	cl.prototype = extend(new F(), obj);

	cl.displayName = obj.displayName || 'Component';

	return cl;
}

// Flatten an Array of mixins to a map of method name to mixin implementations
function collateMixins(mixins) {
	let keyed = {};
	for (let i=0; i<mixins.length; i++) {
		let mixin = mixins[i];
		for (let key in mixin) {
			if (mixin.hasOwnProperty(key) && typeof mixin[key]==='function') {
				(keyed[key] || (keyed[key]=[])).push(mixin[key]);
			}
		}
	}
	return keyed;
}

// apply a mapping of Arrays of mixin methods to a component prototype
function applyMixins(proto, mixins) {
	for (let key in mixins) if (mixins.hasOwnProperty(key)) {
		proto[key] = multihook(
			mixins[key].concat(proto[key] || ARR),
			key==='getDefaultProps' || key==='getInitialState' || key==='getChildContext'
		);
	}
}

function bindAll(ctx) {
	for (let i in ctx) {
		let v = ctx[i];
		if (typeof v==='function' && !v.__bound && !AUTOBIND_BLACKLIST.hasOwnProperty(i)) {
			(ctx[i] = v.bind(ctx)).__bound = true;
		}
	}
}

function callMethod(ctx, m, args) {
	if (typeof m==='string') {
		m = ctx.constructor.prototype[m];
	}
	if (typeof m==='function') {
		return m.apply(ctx, args);
	}
}

function multihook(hooks, skipDuplicates) {
	return function() {
		let ret;
		for (let i=0; i<hooks.length; i++) {
			let r = callMethod(this, hooks[i], arguments);

			if (skipDuplicates && r!=null) {
				if (!ret) ret = {};
				for (let key in r) if (r.hasOwnProperty(key)) {
					ret[key] = r[key];
				}
			}
			else if (typeof r!=='undefined') ret = r;
		}
		return ret;
	};
}

function newComponentHook(props, context) {
	this.componentWillReceiveProps = multihook([this.componentWillReceiveProps || 'componentWillReceiveProps']);
	this.render = multihook([ beforeRender, this.render || 'render', afterRender]);
}

function beforeRender(props) {
	currentComponent = this;
}

function afterRender() {
	if (currentComponent===this) {
		currentComponent = null;
	}
}

function Component(props, context, opts) {
	PreactComponent.call(this, props, context);
	this.state = this.getInitialState ? this.getInitialState() : {};
	this.refs = {};
	this._refProxies = {};
	if (opts!==BYPASS_HOOK) {
		newComponentHook.call(this, props, context);
	}
}
extend(Component.prototype = Object.create(PreactComponent.prototype), {
	constructor: Component,

	isReactComponent: {},

	replaceState(state, callback) {
		for (let i in this.state) {
			if (!(i in state)) {
				delete this.state[i];
			}
		}
		this.setState(state, callback);
	},

	getDOMNode() {
		return this.base;
	},

	isMounted() {
		return !!this.base;
	}
});

function PureComponent(props, context) {
	PreactComponent.call(this, props, context);
}
PureComponent.prototype = Object.create(PreactComponent.prototype);
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
	DOM,
	PropTypes,
	Children,
	render,
	render as hydrate,
	createClass,
	createPortal,
	createFactory,
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
	DOM,
	PropTypes,
	Children,
	render,
	hydrate: render,
	createClass,
	createPortal,
	createFactory,
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
