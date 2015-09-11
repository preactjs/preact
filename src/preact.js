const EMPTY = {};
const NO_RENDER = { render: false };
const SYNC_RENDER = { renderSync: true };
const DOM_RENDER = { build: true };
const NON_DIMENSION_PROPS = `
	boxFlex boxFlexGroup columnCount fillOpacity flex flexGrow
	flexPositive flexShrink flexNegative fontWeight lineClamp
	lineHeight opacity order orphans strokeOpacity widows zIndex zoom
`.trim().split(/\s+/g).reduce( (acc, prop) => (acc[prop] = true, acc), {});

let slice = Array.prototype.slice,
	options = {
		syncComponentUpdates: true
	},
	hooks = {};

export { options, hooks };


export function render(component, parent) {
	let built = build(null, component),
		c = built._component;
	if (c) hook(c, 'componentWillMount');
	parent.appendChild(built);
	if (c) hook(c, 'componentDidMount');
	return build;
}


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

let jsToCss = s => s.replace(/([A-Z])/,'-$1').toLowerCase();



/** Provides a base Component class with an API similar to React. */
export class Component {
	constructor() {
		this._dirty = false;
		this.props = hook(this, 'getDefaultProps') || {};
		this.state = hook(this, 'getInitialState') || {};
		hook(this, 'initialize');
	}

	shouldComponentUpdate(props, state) {
		return true;
	}

	setState(state) {
		extend(this.state, state);
		this.triggerRender();
	}

	setProps(props, opts=EMPTY) {
		let d = this._disableRendering===true;
		this._disableRendering = true;
		hook(this, 'componentWillReceiveProps', props, this.props);
		//this.props = props;
		this.nextProps = props;
		this._disableRendering = d;
		if (opts.renderSync===true && options.syncComponentUpdates===true) {
			this._render();
		}
		else if (opts.render!==false) {
			this.triggerRender();
		}
	}

	triggerRender() {
		if (this._dirty!==true) {
			this._dirty = true;
			renderQueue.add(this);
		}
	}

	render(props, state) {
		return h('div', { component:this.constructor.name }, props.children);
	}

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
			let base = build(this.base, rendered);
			if (this.base && base!==this.base) {
				this.base.parentNode.insertBefore(base, this.base);
				this.base.parentNode.removeChild(this.base);
			}
			this.base = base;
		}

		hook(this, 'componentDidUpdate');
	}
}



/** jsx hyperscript generator
 *  To use, add the directive:
 *  /** @jsx h *\/
 *  import { render, h } from 'react-compat';
 *  render(<span>foo</span>, document.body);
 */
export function h(nodeName, attributes, ...args) {
	let children = null,
		sharedArr = [],
		arr, lastSimple;
	if (args.length) {
		children = [];
		for (let i=0; i<args.length; i++) {
			if (Array.isArray(args[i])) {
				arr = args[i];
			}
			else {
				arr = sharedArr;
				arr[0] = args[i];
			}
			for (let j=0; j<arr.length; j++) {
				let child = arr[j];
				let simple = notEmpty(child) && !isVNode(child);
				if (simple) child = String(child);
				if (simple && lastSimple) {
					children[children.length-1] += child;
				}
				else if (child!==null && child!==undefined) {
					children.push(child);
				}
				lastSimple = simple;
			}
		}
	}

	let p = new VNode(nodeName, attributes, children);
	hook(hooks, 'vnode', p);
	return p;
}

class VNode {
	constructor(nodeName, attributes, children) {
		this.nodeName = nodeName;
		this.attributes = attributes;
		this.children = children;
	}
}
VNode.prototype.__isVNode = true;




/** invoke a hook method gracefully */
function hook(obj, name, ...args) {
	let fn = obj[name];
	if (fn && typeof fn==='function') return fn.apply(obj, args);
}

function isVNode(obj) {
	return obj && obj.__isVNode===true;
}

function notEmpty(x) {
	return x!==null && x!==undefined;
}

function isSameNodeType(node, vnode) {
	if (node.nodeType===3) {
		return typeof vnode==='string';
	}
	let nodeName = vnode.nodeName;
	if (typeof nodeName==='function') return node._componentConstructor===nodeName;
	return node.nodeName.toLowerCase()===nodeName;
}


function buildComponentFromVNode(dom, vnode) {
	let c = dom && dom._component;

	if (c && dom._componentConstructor===vnode.nodeName) {
		let props = getNodeProps(vnode);
		c.setProps(props, SYNC_RENDER);
		return dom;
	}
	else {
		if (c) unmountComponent(dom, c);
		return createComponentFromVNode(vnode)
	}
}

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


/** Apply differences in a given vnode (and it's deep children) to a real DOM Node. */
function build(dom, vnode) {
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

	if (!dom) {
		out = recycler.create(nodeName);
	}
	else if (dom.nodeName.toLowerCase()!==nodeName) {
		out = recycler.create(nodeName);
		appendChildren(out, slice.call(dom.childNodes));
		// reclaim element nodes
		if (dom.nodeType===1) recycler.collect(dom);
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

let rerender = renderQueue.process;
export { rerender };


/** Typed DOM node factory with reclaimation */
let recycler = {
	nodes: {},
	collect(node) {
		let name = node.nodeName;
		recycler.clean(node);
		let list = recycler.nodes[name] || (recycler.nodes[name] = []);
		list.push(node);
	},
	create(nodeName) {
		let list = recycler.nodes[name];
		if (list && list.length) {
			return list.splice(0, 1)[0];
		}
		return document.createElement(nodeName);
	},
	clean(node) {
		node.remove();

		if (node.attributes) {
			let attrs = getNodeAttributes(node);
			for (let attr in attrs) if (attrs.hasOwnProperty(attr)) {
				node.removeAttribute(attr);
			}
		}

		// if (node.childNodes.length>0) {
		// 	console.warn(`Warning: Recycler collecting <${node.nodeName}> with ${node.childNodes.length} children.`);
		// 	slice.call(node.childNodes).forEach(recycler.collect);
		// }
	}
};


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


function getAccessor(node, name, value) {
	if (name==='class') return node.className;
	if (name==='style') return node.style.cssText;
	return value;
	//return getComplexAccessor(node, name, value);
}

// function getComplexAccessor(node, name, value) {
// 	let uc = 'g'+nameToAccessor(name).substring(1);
// 	if (node[uc] && typeof node[uc]==='function') {
// 		return node[uc]();
// 	}
// 	return value;
// }


/** Attempt to set via an accessor method, falling back to setAttribute().
 *	Automatically detects and adds/removes event handlers based for "attributes" beginning with "on".
 *	If `value=null`, triggers attribute/handler removal.
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

function eventProxy(e) {
	let l = this._listeners,
		fn = l[e.type.toLowerCase()];
	if (fn) return fn.call(l, hook(hooks, 'event', e) || e);
}

function setComplexAccessor(node, name, value, old) {
	if (name.substring(0,2)==='on') {
		let type = name.substring(2).toLowerCase(),
			l = node._listeners || (node._listeners = {});
		if (!l[type]) node.addEventListener(type, eventProxy);
		l[type] = value;
		return;
	}

	let uc = nameToAccessor(name);
	if (node[uc] && typeof node[uc]==='function') {
		node[uc](value);
	}
	else if (value!==null) {
		node.setAttribute(name, value);
	}
	else {
		node.removeAttribute(name);
	}
}

function nameToAccessor(name) {
	let c = nameToAccessorCache[name];
	if (!c) {
		c = 'set' + name.charAt(0).toUpperCase() + name.substring(1);
		nameToAccessorCache[name] = c;
	}
	return c;
}
let nameToAccessorCache = {};


function getNodeAttributes(node) {
	let list = node.attributes;
	if (!list.getNamedItem) return list;
	if (list.length) return getAttributesAsObject(list);
}

function getAttributesAsObject(list) {
	let attrs = {};
	for (let i=list.length; i--; ) {
		let item = list[i];
		attrs[item.name] = item.value;
	}
	return attrs;
}


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


function extend(obj, props) {
	for (let i in props) if (props.hasOwnProperty(i)) {
		obj[i] = props[i];
	}
	return obj;
}
