import { ATTR_KEY } from '../constants';
import { createObject, toLowerCase, memoize, falsey, isFunction } from '../util';
import { optionsHook } from '../hooks';


export function ensureNodeData(node, data) {
	return getNodeData(node) || (node[ATTR_KEY] = (data || createObject()));
}


export function getNodeData(node) {
	if (node[ATTR_KEY]!==undefined) return node[ATTR_KEY];
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


/** Retrieve the value of a rendered attribute
 *	@private
 */
export function getAccessor(node, name) {
	if (name!=='type' && name!=='style' && name!=='key' && name in node) return node[name];
	let attrs = getNodeData(node);
	if (attrs && (name in attrs)) return attrs[name];
	if (name==='class') return node.className || '';
	if (name==='style') return node.style.cssText || '';
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
		node.className = value || '';
	}
	else if (name==='style') {
		node.style.cssText = value || '';
	}
	else if (name==='dangerouslySetInnerHTML') {
		if (value && value.__html) node.innerHTML = value.__html;
	}
	else if (name!=='key') {
		// let valueIsFalsey = falsey(value);

		if (name!=='type' && name in node) {
			node[name] = value;
			if (falsey(value)) node.removeAttribute(name);
		}
		else if (name.substring(0, 2)==='on') {
			let type = normalizeEventName(name),
				l = node._listeners || (node._listeners = createObject());
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

	ensureNodeData(node)[name] = value;
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
		attrs = createObject(),
		i = list.length;
	while (i--) attrs[list[i].name] = list[i].value;
	return attrs;
}
