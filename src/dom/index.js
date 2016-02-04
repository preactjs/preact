import { ATTR_KEY, EMPTY } from '../constants';
import { hasOwnProperty, memoize } from '../util';
import options from '../options';
import { hook } from '../hooks';


export function ensureNodeData(node) {
	return node[ATTR_KEY] || (node[ATTR_KEY] = {});
}


/** Append multiple children to a Node.
 *	Uses a Document Fragment to batch when appending 2 or more children
 *	@private
 */
export function appendChildren(parent, children) {
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



/** Retrieve the value of a rendered attribute
 *	@private
 */
export function getAccessor(node, name, value, cache) {
	if (name!=='type' && name in node) return node[name];
	if (name==='class') return node.className;
	if (name==='style') return node.style.cssText;
	let attrs = node[ATTR_KEY];
	if (cache!==false && attrs && hasOwnProperty.call(attrs, name)) return attrs[name];
	return value;
}



/** Set a named attribute on the given Node, with special behavior for some names and event handlers.
 *	If `value` is `null`, the attribute/handler will be removed.
 *	@param {Element} node	An element to mutate
 *	@param {string} name	The name/key to set, such as an event or attribute name
 *	@param {any} value		An attribute value, such as a function to be used as an event handler
 *	@param {any} previousValue	The last value that was set for this name/node pair
 *	@private
 */
export function setAccessor(node, name, value) {
	if (name==='class') {
		node.className = value;
	}
	else if (name==='style') {
		node.style.cssText = value;
	}
	else if (name==='dangerouslySetInnerHTML') {
		node.innerHTML = value.__html;
	}
	else if (name in node && name!=='type') {
		node[name] = value;
	}
	else {
		setComplexAccessor(node, name, value);
	}

	ensureNodeData(node)[name] = getAccessor(node, name, value, false);
}


/** For props without explicit behavior, apply to a Node as event handlers or attributes.
 *	@private
 */
function setComplexAccessor(node, name, value) {
	if (name.substring(0,2)==='on') {
		let type = normalizeEventName(name),
			l = node._listeners || (node._listeners = {}),
			fn = !l[type] ? 'add' : !value ? 'remove' : null;
		if (fn) node[fn+'EventListener'](type, eventProxy);
		l[type] = value;
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



/** Proxy an event to hooked event handlers
 *	@private
 */
function eventProxy(e) {
	let fn = this._listeners[normalizeEventName(e.type)];
	if (fn) return fn.call(this, hook(options, 'event', e) || e);
}



/** Convert an Event name/type to lowercase and strip any "on*" prefix.
 *	@function
 *	@private
 */
let normalizeEventName = memoize(t => t.replace(/^on/i,'').toLowerCase());



/** Get a hashmap of node properties, preferring preact's cached property values over the DOM's
 *	@private
 */
export function getNodeAttributes(node) {
	return node[ATTR_KEY] || getRawNodeAttributes(node) || EMPTY;
	// let list = getRawNodeAttributes(node),
	// 	l = node[ATTR_KEY];
	// return l && list ? extend(list, l) : (l || list || EMPTY);
}


/** Get a node's attributes as a hashmap, regardless of type.
 *	@private
 */
function getRawNodeAttributes(node) {
	let list = node.attributes;
	if (!list || !list.getNamedItem) return list;
	if (list.length) return getAttributesAsObject(list);
}


/** Convert a DOM `.attributes` NamedNodeMap to a hashmap.
 *	@private
 */
function getAttributesAsObject(list) {
	let attrs;
	for (let i=list.length; i--; ) {
		let item = list[i];
		if (!attrs) attrs = {};
		attrs[item.name] = item.value;
	}
	return attrs;
}
