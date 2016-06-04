import { ATTR_KEY } from '../constants';
import { toLowerCase, memoize, empty, falsey, isFunction } from '../util';
import { optionsHook } from '../hooks';


export function ensureNodeData(node, data) {
	return node[ATTR_KEY] || (node[ATTR_KEY] = (data || {}));
}


export function getNodeType(node) {
	if (node instanceof Text) return 3;
	if (node instanceof Element) return 1;
	return 0;
}


/** Append multiple children to a Node.
 *	Uses a Document Fragment to batch when appending 2 or more children
 *	@private
 */
export function appendChildren(parent, children) {
	let len = children.length,
		many = len>2,
		into = many ? document.createDocumentFragment() : parent;
	for (let i=0; i<len; i++) into.appendChild(children[i]);
	if (many) parent.appendChild(into);
}


/** Removes a given DOM Node from its parent. */
export function removeNode(node) {
	let p = node.parentNode;
	if (p) p.removeChild(node);
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
	ensureNodeData(node)[name] = value;

	if (name==='key' || name==='children') return;

	if (name==='class') {
		node.className = value || '';
	}
	else if (name==='style') {
		node.style.cssText = value || '';
	}
	else if (name==='dangerouslySetInnerHTML') {
		if (value && value.__html) node.innerHTML = value.__html;
	}
	else if (name!=='type' && name in node) {
		setProperty(node, name, empty(value) ? '' : value);
		if (falsey(value)) node.removeAttribute(name);
	}
	else if (name[0]==='o' && name[1]==='n') {
		let type = normalizeEventName(name),
			l = node._listeners || (node._listeners = {});
		if (!l[type]) node.addEventListener(type, eventProxy);
		else if (!value) node.removeEventListener(type, eventProxy);
		l[type] = value;
	}
	else if (falsey(value)) {
		node.removeAttribute(name);
	}
	else if (typeof value!=='object' && !isFunction(value)) {
		node.setAttribute(name, value);
	}
}


/** Attempt to set a DOM property to the given value.
 *	IE & FF throw for certain property-value combinations.
 */
function setProperty(node, name, value) {
	try {
		node[name] = value;
	} catch (e) { }
}


/** Proxy an event to hooked event handlers
 *	@private
 */
function eventProxy(e) {
	return this._listeners[normalizeEventName(e.type)](optionsHook('event', e) || e);
}



/** Convert an Event name/type to lowercase and strip any "on*" prefix.
 *	@function
 *	@private
 */
let normalizeEventName = memoize( t => toLowerCase(t.replace(/^on/i,'')) );





/** Get a node's attributes as a hashmap.
 *	@private
 */
export function getRawNodeAttributes(node) {
	let list = node.attributes,
		attrs = {},
		i = list.length;
	while (i--) attrs[list[i].name] = list[i].value;
	return attrs;
}
