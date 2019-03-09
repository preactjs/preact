import { render as preactRender, cloneElement as preactCloneElement, createRef, h, Component, options, toChildArray, createContext, Fragment } from 'preact';
import * as hooks from 'preact/hooks';
export * from 'preact/hooks';

const version = '16.8.0'; // trick libraries to think we are react

/* istanbul ignore next */
const REACT_ELEMENT_TYPE = (typeof Symbol!=='undefined' && Symbol.for && Symbol.for('react.element')) || 0xeac7;

const CAMEL_PROPS = /^(?:accent|alignment|arabic|baseline|cap|clip|color|fill|flood|font|glyph|horiz|marker|overline|paint|stop|strikethrough|stroke|text|underline|unicode|units|v|vector|vert|word|writing|x)[A-Z]/;

let oldEventHook = options.event;
options.event = e => {
	/* istanbul ignore next */
	if (oldEventHook) e = oldEventHook(e);
	e.persist = Object;
	e.nativeEvent = e;
	return e;
};

/**
 * Legacy version of createElement.
 * @param {import('./internal').VNode["type"]} type The node name or Component constructor
 */
function createFactory(type) {
	return createElement.bind(null, type);
}

/**
 * Normalize DOM vnode properties.
 * @param {import('./internal').VNode} vnode The vnode to normalize props of
 * @param {object | null | undefined} props props to normalize
 */
function handleElementVNode(vnode, props) {
	let shouldSanitize, attrs, i;
	for (i in props) if ((shouldSanitize = CAMEL_PROPS.test(i))) break;
	if (shouldSanitize) {
		attrs = vnode.props = {};
		for (i in props) {
			attrs[CAMEL_PROPS.test(i) ? i.replace(/([A-Z0-9])/, '-$1').toLowerCase() : i] = props[i];
		}
	}
}

/**
 * Proxy render() since React returns a Component reference.
 * @param {import('./internal').VNode} vnode VNode tree to render
 * @param {import('./internal').PreactElement} parent DOM node to render vnode tree into
 * @param {() => void} [callback] Optional callback that will be called after rendering
 * @returns {import('./internal').Component | null} The root component reference or null
 */
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

/**
 * Portal component
 * @param {object | null | undefined} props
 */
function Portal(props) {
	let wrap = h(ContextProvider, { context: this.context }, props.vnode);
	render(wrap, props.container);
	return null;
}

/**
 * Create a `Portal` to continue rendering the vnode tree at a different DOM node
 * @param {import('./internal').VNode} vnode The vnode to render
 * @param {import('./internal').PreactElement} container The DOM node to continue rendering in to.
 */
function createPortal(vnode, container) {
	return h(Portal, { vnode, container });
}

const mapFn = (children, fn) => {
	if (children == null) return null;
	children = toChildArray(children);
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

/**
 * Upgrade all found vnodes recursively
 * @param {Array} arr
 * @param {number} offset
 */
function upgradeToVNodes(arr, offset) {
	for (let i=offset || 0; i<arr.length; i++) {
		let obj = arr[i];
		if (Array.isArray(obj)) {
			upgradeToVNodes(obj);
		}
		else if (obj && typeof obj==='object' && !isValidElement(obj) && ((obj.props && obj.type) || obj.text!=null)) {
			if (obj.text) continue;
			arr[i] = createElement(obj.type, obj.props, obj.props.children);
		}
	}
}

/**
 * Wrap `createElement` to apply various vnode normalizations.
 * @param {import('./internal').VNode["type"]} type The node name or Component constructor
 * @param {object | null | undefined} [props] The vnode's properties
 * @param {Array<import('./internal').ComponentChildren>} [children] The vnode's children
 * @returns {import('./internal').VNode}
 */
function createElement(...args) {
	upgradeToVNodes(args, 2);
	let vnode = h(...args);
	vnode.$$typeof = REACT_ELEMENT_TYPE;

	let type = vnode.type, props = vnode.props;
	if (typeof type!='function') {
		if (props.defaultValue) {
			if (!props.value && props.value!==0) {
				props.value = props.defaultValue;
			}
			delete props.defaultValue;
		}

		handleElementVNode(vnode, props);
	}

	vnode.preactCompatNormalized = false;
	return normalizeVNode(vnode);
}

/**
 * Normalize a vnode
 * @param {import('./internal').VNode} vnode
 */
function normalizeVNode(vnode) {
	vnode.preactCompatNormalized = true;
	applyClassName(vnode);
	applyEventNormalization(vnode);
	return vnode;
}

/**
 * Wrap `cloneElement` to abort if the passed element is not a valid element and apply
 * all vnode normalizations.
 * @param {import('./internal').VNode} element The vnode to clone
 * @param {object} props Props to add when cloning
 * @param {Array<import('./internal').ComponentChildren} rest Optional component children
 */
function cloneElement(element) {
	if (!isValidElement(element)) return element;
	let vnode = normalizeVNode(preactCloneElement.apply(null, arguments));
	vnode.$$typeof = REACT_ELEMENT_TYPE;
	return vnode;
}

/**
 * Check if the passed element is a valid (p)react node.
 * @param {*} element The element to check
 * @returns {boolean}
 */
function isValidElement(element) {
	return element && element.$$typeof===REACT_ELEMENT_TYPE;
}

/**
 * Normalize event handlers like react does. Most famously it uses `onChange` for any input element.
 * @param {import('./internal').VNode} vnode The vnode to normalize events on
 */
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
	if (newProps.onbeforeinput) {
		props.onbeforeinput = props[newProps.onbeforeinput];
		delete props[newProps.onbeforeinput];
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

/**
 * Remove a component tree from the DOM, including state and event handlers.
 * @param {Element | Document | ShadowRoot | DocumentFragment} container
 * @returns {boolean}
 */
function unmountComponentAtNode(container) {
	if (container._prevVNode!=null) {
		preactRender(null, container);
		return true;
	}
	return false;
}

/**
 * Alias `class` prop to `className` if available
 * @param {import('./internal').VNode} vnode
 */
function applyClassName(vnode) {
	let a = vnode.props;
	if (a.class || a.className) {
		classNameDescriptor.enumerable = 'className' in a;
		if (a.className) a.class = a.className;
		Object.defineProperty(a, 'className', classNameDescriptor);
	}
}

let classNameDescriptor = {
	configurable: true,
	get() { return this.class; }
};

/**
 * Check if two objects have a different shape
 * @param {object} a
 * @param {object} b
 * @returns {boolean}
 */
function shallowDiffers(a, b) {
	for (let i in a) if (!(i in b)) return true;
	for (let i in b) if (a[i]!==b[i]) return true;
	return false;
}

/**
 * Get the matching DOM node for a component
 * @param {import('./internal').Component} component
 * @returns {import('./internal').PreactElement | null}
 */
function findDOMNode(component) {
	return component && (component.base || component.nodeType === 1 && component) || null;
}

/**
 * Component class with a predefined `shouldComponentUpdate` implementation
 */
class PureComponent extends Component {
	constructor(props) {
		super(props);
		// Some third-party libraries check if this property is present
		this.isPureReactComponent = true;
	}

	shouldComponentUpdate(props, state) {
		return shallowDiffers(this.props, props) || shallowDiffers(this.state, state);
	}
}

// Some libraries like `react-virtualized` explicitely check for this.
Component.prototype.isReactComponent = {};

/**
 * Memoize a component, so that it only updates when the props actually have
 * changed. This was previously known as `React.pure`.
 * @param {import('./internal').ComponentFactory<any>} c The component constructor
 * @param {(prev: object, next: object) => boolean} [comparer] Custom equality function
 * @returns {import('./internal').ComponentFactory<any>}
 */
function memo(c, comparer) {
	function shouldUpdate(nextProps) {
		return !comparer(this.props, nextProps);
	}

	function Memoed(props, context) {
		this.shouldComponentUpdate =
			this.shouldComponentUpdate ||
			(comparer ? shouldUpdate : PureComponent.prototype.shouldComponentUpdate);
		return c.call(this, props, context);
	}
	Memoed.displayName = 'Memo(' + (c.displayName || c.name) + ')';
	return Memoed;
}

// Patch in `UNSAFE_*` lifecycle hooks
function setUnsafeDescriptor(obj, key) {
	Object.defineProperty(obj.prototype, 'UNSAFE_' + key, {
		configurable: true,
		get() { return this[key]; },
		set(v) { this[key] = v; }
	});
}

setUnsafeDescriptor(Component, 'componentWillMount');
setUnsafeDescriptor(Component, 'componentWillReceiveProps');
setUnsafeDescriptor(Component, 'componentWillUpdate');

/**
 * Pass ref down to a child. This is mainly used in libraries with HOCs that
 * wrap components. Using `forwardRef` there is an easy way to get a reference
 * of the wrapped component instead of one of the wrapper itself.
 * @param {import('./internal').ForwardFn} fn
 * @returns {import('./internal').FunctionalComponent}
 */
function forwardRef(fn) {
	function Forwarded(props) {
		let ref = props.ref;
		delete props.ref;
		return fn(props, ref);
	}
	Forwarded._forwarded = true;
	Forwarded.displayName = 'ForwardRef(' + (fn.displayName || fn.name) + ')';
	return Forwarded;
}

let oldVNodeHook = options.vnode;
options.vnode = vnode => {
	let type = vnode.type;
	if (type!=null && type._forwarded) {
		vnode.props.ref = vnode.ref;
		vnode.ref = null;
	}
	/* istanbul ignore next */
	if (oldVNodeHook) oldVNodeHook(vnode);
};

export {
	version,
	Children,
	render,
	render as hydrate,
	unmountComponentAtNode,
	createPortal,
	createElement,
	createContext,
	createFactory,
	cloneElement,
	createRef,
	Fragment,
	isValidElement,
	findDOMNode,
	Component,
	PureComponent,
	memo,
	forwardRef
};

// React copies the named exports to the default one.
export default {
	...hooks,
	version,
	Children,
	render,
	hydrate: render,
	unmountComponentAtNode,
	createPortal,
	createElement,
	createContext,
	createFactory,
	cloneElement,
	createRef,
	Fragment,
	isValidElement,
	findDOMNode,
	Component,
	PureComponent,
	memo,
	forwardRef
};
