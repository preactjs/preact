const EMPTY = {};
const NO_RENDER = { render: false };
const SYNC_RENDER = { renderSync: true };
const DOM_RENDER = { build: true };
const EMPTY_BASE = '';
const NON_DIMENSION_PROPS = {};

'boxFlex boxFlexGroup columnCount fillOpacity flex flexGrow flexPositive flexShrink flexNegative fontWeight lineClamp lineHeight opacity order orphans strokeOpacity widows zIndex zoom'.split(' ').forEach(k => NON_DIMENSION_PROPS[k] = true);

/** @private */
let slice = Array.prototype.slice;

/** @private */
let memoize = (fn, mem={}) => k => mem.hasOwnProperty(k) ? mem[k] : (mem[k] = fn(k));

/** @public @object Global options */
let options = {
	/** If `true`, `prop` changes trigger synchronous component updates. */
	syncComponentUpdates: true
};

/** @public @object Global hook methods */
let hooks = {};


/** @public Render JSX into a `parent` Element. */
export function render(component, parent) {
	let built = build(null, component),
		c = built._component;
	if (c) hook(c, 'componentWillMount');
	parent.appendChild(built);
	if (c) hook(c, 'componentDidMount');
	return build;
}


/** @protected Processes all created VNodes */
hooks.vnode = ({ attributes }) => {
	if (!attributes) return;

	let s = attributes.style;
	if (s && !s.substring) {
		attributes.style = styleObjToCss(s);
	}

	let c = attributes['class'];
	if (attributes.hasOwnProperty('className')) {
		c = attributes['class'] = attributes.className;
		delete attributes.className;
	}
	if (c && !c.substring) {
		attributes['class'] = hashToClassName(c);
	}
};


/** @public Base Component, with API similar to React. */
export class Component {
	constructor() {
		/** @private */
		this._dirty = this._disableRendering = false;
		/** @public */
		this.nextProps = this.base = null;
		/** @type {object} */
		this.props = hook(this, 'getDefaultProps') || {};
		/** @type {object} */
		this.state = hook(this, 'getInitialState') || {};
		hook(this, 'initialize');
	}

	/** Returns a `boolean` value indicating if the component should re-render when receiving the given `props` and `state`.
	 *	@param {object} props
	 *	@param {object} state
	 */
	shouldComponentUpdate(props, state) {
		return true;
	}

	/** Update component state by copying values from `state` to `this.state`.
	 *	@param {object} state
	 */
	setState(state) {
		extend(this.state, state);
		this.triggerRender();
	}

	/** Set `props` for the component.
	*	@param {object} props
	*	@param {object} [opts]
	*	@param {object} [opts.renderSync] - If `true` and {@link options.syncComponentUpdates} is `true`, triggers synchronous rendering.
	*	@param {object} [opts.render=true] - If `false`, no render will be triggered.
	 */
	setProps(props, opts=EMPTY) {
		let d = this._disableRendering===true;
		this._disableRendering = true;
		hook(this, 'componentWillReceiveProps', props, this.props);
		this.nextProps = props;
		this._disableRendering = d;
		if (opts.renderSync===true && options.syncComponentUpdates===true) {
			this._render();
		}
		else if (opts.render!==false) {
			this.triggerRender();
		}
	}

	/** Mark component as dirty and queue up a render. */
	triggerRender() {
		if (this._dirty!==true) {
			this._dirty = true;
			renderQueue.add(this);
		}
	}

	/** Accepts `props` and `state`, and returns a new Virtual DOM tree to build.
	 *	Virtual DOM is generally constructed via [JSX](http://jasonformat.com/wtf-is-jsx).
	 *	@returns VNode
	 */
	render(props, state) {
		return h('div', { component:this.constructor.name }, props.children);
	}

	/** @private */
	_render(opts=EMPTY) {
		if (this._disableRendering===true) return;

		this._dirty = false;

		if (this.base && hook(this, 'shouldComponentUpdate', this.props, this.state)===false) {
			this.props = this.nextProps;
			return;
		}

		this.props = this.nextProps;

		hook(this, 'componentWillUpdate');

		let rendered = hook(this, 'render', this.props, this.state);

		if (this.base || opts.build===true) {
			let base = build(this.base, rendered || EMPTY_BASE, this);
			if (this.base && base!==this.base) {
				let p = this.base.parentNode;
				if (p) p.replaceChild(base, this.base);
			}
			this.base = base;
		}

		hook(this, 'componentDidUpdate');
	}
}



/** @public JSX/hyperscript reviver
 *	@see http://jasonformat.com/wtf-is-jsx
 *  @example
 *  /** @jsx h *\/
 *  import { render, h } from 'preact';
 *  render(<span>foo</span>, document.body);
 */
export function h(nodeName, attributes, ...args) {
	let children,
		sharedArr = [],
		len = args.length,
		arr, lastSimple;
	if (len) {
		children = [];
		for (let i=0; i<len; i++) {
			let p = args[i];
			if (p===null || p===undefined) continue;
			if (p.join) {			// Array.isArray(args[i])
				arr = p;
			}
			else {
				arr = sharedArr;
				arr[0] = p;
			}
			for (let j=0; j<arr.length; j++) {
				let child = arr[j],
					simple = notEmpty(child) && !isVNode(child);
				if (simple) child = String(child);
				if (simple && lastSimple) {
					children[children.length-1] += child;
				}
				else if (notEmpty(child)) {
					children.push(child);
				}
				lastSimple = simple;
			}
		}
	}

	if (attributes && attributes.children) {
		delete attributes.children;
	}

	let p = new VNode(nodeName, attributes || undefined, children || undefined);
	hook(hooks, 'vnode', p);
	return p;
}


/** Virtual DOM Node */
export class VNode {
	constructor(nodeName, attributes, children) {
		/** @type {string|class} */
		this.nodeName = nodeName;

		/** @type {object<string>|undefined} */
		this.attributes = attributes;

		/** @type {array<VNode>|undefined} */
		this.children = children;
	}
}
VNode.prototype.__isVNode = true;


/** @private Invoke a "hook" method with arguments if it exists. */
function hook(obj, name, ...args) {
	let fn = obj[name];
	if (fn && typeof fn==='function') return fn.apply(obj, args);
}


/** @private Fast check if an object is a VNode. */
function isVNode(obj) {
	return obj && obj.__isVNode===true;
}


/** @private Check if a value is `null` or `undefined`. */
function notEmpty(x) {
	return x!==null && x!==undefined;
}


/** @private Check if two nodes are equivalent. */
function isSameNodeType(node, vnode) {
	if (node.nodeType===3) {
		return typeof vnode==='string';
	}
	let nodeName = vnode.nodeName;
	if (typeof nodeName==='function') return node._componentConstructor===nodeName;
	return node.nodeName.toLowerCase()===nodeName;
}


/** @private Apply the component referenced by a VNode to the DOM. */
function buildComponentFromVNode(dom, vnode) {
	let c = dom && dom._component;

	if (c && dom._componentConstructor===vnode.nodeName) {
		let props = getNodeProps(vnode);
		c.setProps(props, SYNC_RENDER);
		return dom;
	}
	else {
		if (c) unmountComponent(dom, c);
		return createComponentFromVNode(vnode);
	}
}


/** @private Instantiate and render a Component, given a VNode whose nodeName is a constructor. */
function createComponentFromVNode(vnode) {
	let component = componentRecycler.create(vnode.nodeName);

	let props = getNodeProps(vnode);
	component.setProps(props, NO_RENDER);
	component._render(DOM_RENDER);

	let node = component.base;
	node._component = component;
	node._componentConstructor = vnode.nodeName;

	return node;
}


/** @private Remove a component from the DOM and recycle it. */
function unmountComponent(dom, component) {
	console.warn('unmounting mismatched component', component);

	delete dom._component;
	hook(component, 'componentWillUnmount');
	let base = component.base;
	if (base && base.parentNode) {
		base.parentNode.removeChild(base);
	}
	hook(component, 'componentDidUnmount');
	componentRecycler.collect(component);
}


/** @private Apply differences in a given vnode (and it's deep children) to a real DOM Node. */
function build(dom, vnode, rootComponent) {
	let out = dom,
		nodeName = vnode.nodeName;

	if (typeof nodeName==='function') {
		return buildComponentFromVNode(dom, vnode);
	}

	if (typeof vnode==='string') {
		if (dom) {
			if (dom.nodeType===3) {
				dom.textContent = vnode;
				return dom;
			}
			else {
				if (dom.nodeType===1) recycler.collect(dom);
			}
		}
		return document.createTextNode(vnode);
	}

	if (nodeName===null || nodeName===undefined) {
		nodeName = 'x-undefined-element';
	}

	if (!dom) {
		out = recycler.create(nodeName);
	}
	else if (dom.nodeName.toLowerCase()!==nodeName) {
		out = recycler.create(nodeName);
		appendChildren(out, slice.call(dom.childNodes));
		// reclaim element nodes
		if (dom.nodeType===1) recycler.collect(dom);
	}
	else if (dom._component && dom._component!==rootComponent) {
		unmountComponent(dom, dom._component);
	}

	// apply attributes
	let old = getNodeAttributes(out) || EMPTY,
		attrs = vnode.attributes || EMPTY;

	// removed attributes
	if (old!==EMPTY) {
		for (let name in old) {
			if (old.hasOwnProperty(name)) {
				let o = attrs[name];
				if (o===undefined || o===null || o===false) {
					setAccessor(out, name, null, old[name]);
				}
			}
		}
	}

	// new & updated attributes
	if (attrs!==EMPTY) {
		for (let name in attrs) {
			if (attrs.hasOwnProperty(name)) {
				let value = attrs[name];
				if (value!==undefined && value!==null && value!==false) {
					let prev = getAccessor(out, name, old[name]);
					if (value!==prev) {
						setAccessor(out, name, value, prev);
					}
				}
			}
		}
	}


	let children = slice.call(out.childNodes);
	let keyed = {};
	for (let i=children.length; i--; ) {
		let t = children[i].nodeType;
		let key;
		if (t===3) {
			key = t.key;
		}
		else if (t===1) {
			key = children[i].getAttribute('key');
		}
		else {
			continue;
		}
		if (key) keyed[key] = children.splice(i, 1)[0];
	}
	let newChildren = [];

	if (vnode.children) {
		for (let i=0, vlen=vnode.children.length; i<vlen; i++) {
			let vchild = vnode.children[i];
			let attrs = vchild.attributes;
			let key, child;
			if (attrs) {
				key = attrs.key;
				child = key && keyed[key];
			}

			// attempt to pluck a node of the same type from the existing children
			if (!child) {
				let len = children.length;
				if (children.length) {
					for (let j=0; j<len; j++) {
						if (isSameNodeType(children[j], vchild)) {
							child = children.splice(j, 1)[0];
							break;
						}
					}
				}
			}

			// morph the matched/found/created DOM child to match vchild (deep)
			newChildren.push(build(child, vchild));
		}
	}

	// apply the constructed/enhanced ordered list to the parent
	for (let i=0, len=newChildren.length; i<len; i++) {
		// we're intentionally re-referencing out.childNodes here as it is a live array (akin to live NodeList)
		if (out.childNodes[i]!==newChildren[i]) {
			let child = newChildren[i],
				c = child._component,
				next = out.childNodes[i+1];
			if (c) hook(c, 'componentWillMount');
			if (next) {
				out.insertBefore(child, next);
			}
			else {
				out.appendChild(child);
			}
			if (c) hook(c, 'componentDidMount');
		}
	}

	// remove orphaned children
	for (let i=0, len=children.length; i<len; i++) {
		let child = children[i],
			c = child._component;
		if (c) hook(c, 'componentWillUnmount');
		child.parentNode.removeChild(child);
		if (c) {
			hook(c, 'componentDidUnmount');
			componentRecycler.collect(c);
		}
		else if (child.nodeType===1) {
			recycler.collect(child);
		}
	}

	return out;
}


/** @private Managed re-rendering queue for dirty components. */
let renderQueue = {
	items: [],
	itemsOffline: [],
	pending: false,
	add(component) {
		if (renderQueue.items.push(component)!==1) return;

		let d = hooks.debounceRendering;
		if (d) d(renderQueue.process);
		else setTimeout(renderQueue.process, 0);
	},
	process() {
		let items = renderQueue.items,
			len = items.length;
		if (!len) return;
		renderQueue.items = renderQueue.itemsOffline;
		renderQueue.items.length = 0;
		renderQueue.itemsOffline = items;
		while (len--) {
			if (items[len]._dirty) {
				items[len]._render();
			}
		}
	}
};

/** @private @function Trigger all pending render() calls. */
let rerender = renderQueue.process


/** @private DOM node pool, keyed on nodeName. */
let recycler = {
	nodes: {},
	collect(node) {
		recycler.clean(node);
		let name = recycler.normalizeName(node.nodeName),
			list = recycler.nodes[name];
		if (list) list.push(node);
		else recycler.nodes[name] = [node];
	},
	create(nodeName) {
		let name = recycler.normalizeName(nodeName),
			list = recycler.nodes[name];
		return list && list.pop() || document.createElement(nodeName);
	},
	clean(node) {
		node.remove();
		let len = node.attributes && node.attributes.length;
		if (len) for (let i=len; i--; ) {
			node.removeAttribute(node.attributes[i].name);
		}

		// if (node.childNodes.length>0) {
		// 	console.warn(`Warning: Recycler collecting <${node.nodeName}> with ${node.childNodes.length} children.`);
		// 	slice.call(node.childNodes).forEach(recycler.collect);
		// }
	},
	normalizeName: memoize(name => name.toUpperCase())
};


/** @private Retains a pool of Components for re-use, keyed on component name. */
let componentRecycler = {
	components: {},
	collect(component) {
		let name = component.constructor.name;
		let list = componentRecycler.components[name] || (componentRecycler.components[name] = []);
		list.push(component);
	},
	create(ctor) {
		let name = ctor.name,
			list = componentRecycler.components[name];
		if (list && list.length) {
			return list.splice(0, 1)[0];
		}
		return new ctor();
	}
};


/** @private Append children to a Node.
 *	Uses a Document Fragment to batch when appending 2 or more children
 */
function appendChildren(parent, children) {
	let len = children.length;
	if (len<=2) {
		parent.appendChild(children[0]);
		if (len===2) parent.appendChild(children[1]);
		return;
	}

	let frag = document.createDocumentFragment();
	for (let i=0; i<len; i++) frag.appendChild(children[i]);
	parent.appendChild(frag);
}


/** @private Get the value of a rendered attribute */
function getAccessor(node, name, value) {
	if (name==='class') return node.className;
	if (name==='style') return node.style.cssText;
	return value;
}


/** @private Set a named attribute on the given Node, with special behavior for some names and event handlers.
 *	If `value` is `null`, the attribute/handler will be removed.
 */
function setAccessor(node, name, value, old) {
	if (name==='class') {
		node.className = value;
	}
	else if (name==='style') {
		node.style.cssText = value;
	}
	else {
		setComplexAccessor(node, name, value, old);
	}
}


/** @private For props without explicit behavior, apply to a Node as event handlers or attributes. */
function setComplexAccessor(node, name, value, old) {
	if (name.substring(0,2)==='on') {
		let type = name.substring(2).toLowerCase(),
			l = node._listeners || (node._listeners = {});
		if (!l[type]) node.addEventListener(type, eventProxy);
		l[type] = value;
		// @TODO automatically remove proxy event listener when no handlers are left
		return;
	}

	let type = typeof value;
	if (value===null) {
		node.removeAttribute(name);
	}
	else if (type!=='function' && type!=='object') {
		node.setAttribute(name, value);
	}
}


/** @private Proxy an event to hooked event handlers */
function eventProxy(e) {
	let l = this._listeners,
		fn = l[normalizeEventType(e.type)];
	if (fn) return fn.call(this, hook(hooks, 'event', e) || e);
}

/** @private @function Normalize an event type/name to lowercase */
let normalizeEventType = memoize(type => type.toLowerCase());



/** @private Get a node's attributes as a hashmap, regardless of type. */
function getNodeAttributes(node) {
	let list = node.attributes;
	if (!list || !list.getNamedItem) return list;
	if (list.length) return getAttributesAsObject(list);
}


/** @private Convert a DOM `.attributes` NamedNodeMap to a hashmap. */
function getAttributesAsObject(list) {
	let attrs = {};
	for (let i=list.length; i--; ) {
		let item = list[i];
		attrs[item.name] = item.value;
	}
	return attrs;
}


/** @private Reconstruct `props` from a VNode */
function getNodeProps(vnode) {
	let props = extend({}, vnode.attributes);
	if (vnode.children) {
		props.children = vnode.children;
	}
	if (vnode.text) {
		props._content = vnode.text;
	}
	return props;
}


/** @private Convert a hashmap of styles to CSSText */
function styleObjToCss(s) {
	let str = '',
		sep = ': ',
		term = '; ';
	for (let prop in s) {
		if (s.hasOwnProperty(prop)) {
			let val = s[prop];
			str += jsToCss(prop);
			str += sep;
			str += val;
			if (typeof val==='number' && !NON_DIMENSION_PROPS.hasOwnProperty(prop)) {
				str += 'px';
			}
			str += term;
		}
	}
	return str;
}


/** @private Convert a hashmap of CSS classes to a space-delimited className string */
function hashToClassName(c) {
	let str = '';
	for (let prop in c) {
		if (c[prop]) {
			if (str) str += ' ';
			str += prop;
		}
	}
	return str;
}


/** @private @function Convert a JavaScript camel-case CSS property name to a CSS property name */
let jsToCss = memoize( s => s.replace(/([A-Z])/,'-$1').toLowerCase() );


/** @private Copy own-properties from `props` onto `obj`. Returns `obj`. */
function extend(obj, props) {
	for (let i in props) if (props.hasOwnProperty(i)) {
		obj[i] = props[i];
	}
	return obj;
}


export { options, hooks, rerender };
export default { options, hooks, render, rerender, h, Component };
