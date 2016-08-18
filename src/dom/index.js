import { ATTR_KEY, NON_DIMENSION_PROPS } from '../constants';
import options from '../options';
import { toLowerCase, empty, falsey, isString, isFunction } from '../util';


export function ensureNodeData(node, data) {
	return node[ATTR_KEY] || (node[ATTR_KEY] = (data || {}));
}


export function getNodeType(node) {
	if (node instanceof Text) return 3;
	if (node instanceof Element) return 1;
	return 0;
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
export function setAccessor(node, name, value, old, isSvg) {
	ensureNodeData(node)[name] = value;

	if (name==='key' || name==='children' || name==='innerHTML') return;

	if (name==='class' && !isSvg) {
		node.className = value || '';
	}
	else if (name==='style') {
		if (!value || isString(value) || isString(old)) {
			node.style.cssText = value || '';
		}
		if (value && typeof value==='object') {
			if (!isString(old)) {
				for (let i in old) if (!(i in value)) node.style[i] = '';
			}
			for (let i in value) {
				node.style[i] = typeof value[i]==='number' && !NON_DIMENSION_PROPS[i] ? (value[i]+'px') : value[i];
			}
		}
	}
	else if (name==='dangerouslySetInnerHTML') {
		if (value) node.innerHTML = value.__html;
	}
	else if (name.match(/^on/i)) {
		let l = node._listeners || (node._listeners = {});
		name = toLowerCase(name.substring(2));
		if (value) {
			if (!l[name]) node.addEventListener(name, eventProxy);
		}
		else if (l[name]) {
			node.removeEventListener(name, eventProxy);
		}
		l[name] = value;
	}
	else if (name!=='type' && !isSvg && name in node) {
		setProperty(node, name, empty(value) ? '' : value);
		if (falsey(value)) node.removeAttribute(name);
	}
	else {
		let ns = isSvg && name.match(/^xlink\:?(.+)/);
		if (falsey(value)) {
			if (ns) node.removeAttributeNS('http://www.w3.org/1999/xlink', toLowerCase(ns[1]));
			else node.removeAttribute(name);
		}
		else if (typeof value!=='object' && !isFunction(value)) {
			if (ns) node.setAttributeNS('http://www.w3.org/1999/xlink', toLowerCase(ns[1]), value);
			else node.setAttribute(name, value);
		}
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
	return this._listeners[e.type](options.event && options.event(e) || e);
}


/** Get a node's attributes as a hashmap.
 *	@private
 */
export function getRawNodeAttributes(node) {
	let attrs = {};
	for (let i=node.attributes.length; i--; ) {
		attrs[node.attributes[i].name] = node.attributes[i].value;
	}
	return attrs;
}
