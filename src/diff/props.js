import { IS_NON_DIMENSIONAL } from '../constants';
import options from '../options';

/**
 * Diff the old and new properties of a VNode and apply changes to the DOM node
 * @param {import('../internal').PreactElement} dom The DOM node to apply
 * changes to
 * @param {object} newProps The new props
 * @param {object} oldProps The old props
 * @param {boolean} isSvg Whether or not this node is an SVG node
 */
export function diffProps(dom, newProps, oldProps, isSvg) {
	let keys = Object.keys(newProps).sort();
	for (let i = 0; i < keys.length; i++) {
		let k = keys[i];
		if (k!=='children' && k!=='key' && (!oldProps || ((k==='value' || k==='checked') ? dom : oldProps)[k]!==newProps[k])) {
			setProperty(dom, k, newProps[k], oldProps[k], isSvg);
		}
	}

	for (let i in oldProps) {
		if (i!=='children' && i!=='key' && (!newProps || !(i in newProps))) {
			setProperty(dom, i, null, oldProps[i], isSvg);
		}
	}
}

let CAMEL_REG = /-?(?=[A-Z])/g;

/**
 * Set a property value on a DOM node
 * @param {import('../internal').PreactElement} dom The DOM node to modify
 * @param {string} name The name of the property to set
 * @param {*} value The value to set the property to
 * @param {*} oldValue The old value the property had
 * @param {boolean} isSvg Whether or not this DOM node is an SVG node or not
 */
function setProperty(dom, name, value, oldValue, isSvg) {
	let v;
	if (name==='class' || name==='className') name = isSvg ? 'class' : 'className';

	if (name==='style') {

		/* Possible golfing activities for setting styles:
		 *   - we could just drop String style values. They're not supported in other VDOM libs.
		 *   - assigning to .style sets .style.cssText - TODO: benchmark this, might not be worth the bytes.
		 *   - assigning also casts to String, and ignores invalid values. This means assigning an Object clears all styles.
		 */
		let s = dom.style;

		if (typeof value==='string') {
			s.cssText = value;
		}
		else {
			if (typeof oldValue==='string') s.cssText = '';
			else {
				// remove values not in the new list
				for (let i in oldValue) {
					if (value==null || !(i in value)) s.setProperty(i.replace(CAMEL_REG, '-'), '');
				}
			}
			for (let i in value) {
				v = value[i];
				if (oldValue==null || v!==oldValue[i]) {
					s.setProperty(i.replace(CAMEL_REG, '-'), typeof v==='number' && IS_NON_DIMENSIONAL.test(i)===false ? (v + 'px') : v);
				}
			}
		}
	}
	else if (name==='dangerouslySetInnerHTML') {
		return;
	}
	// Benchmark for comparison: https://esbench.com/bench/574c954bdb965b9a00965ac6
	else if (name[0]==='o' && name[1]==='n') {
		let useCapture = name !== (name=name.replace(/Capture$/, ''));
		let nameLower = name.toLowerCase();
		name = (nameLower in dom ? nameLower : name).substring(2);

		if (value) {
			if (!oldValue) dom.addEventListener(name, eventProxy, useCapture);
		}
		else {
			dom.removeEventListener(name, eventProxy, useCapture);
		}
		(dom._listeners || (dom._listeners = {}))[name] = value;
	}
	else if (name!=='list' && name!=='tagName' && !isSvg && (name in dom)) {
		dom[name] = value==null ? '' : value;
	}
	else if (value==null || value===false) {
		if (name!==(name = name.replace(/^xlink:?/, ''))) dom.removeAttributeNS('http://www.w3.org/1999/xlink', name.toLowerCase());
		else dom.removeAttribute(name);
	}
	else if (typeof value!=='function') {
		if (name!==(name = name.replace(/^xlink:?/, ''))) dom.setAttributeNS('http://www.w3.org/1999/xlink', name.toLowerCase(), value);
		else dom.setAttribute(name, value);
	}
}

/**
 * Proxy an event to hooked event handlers
 * @param {Event} e The event object from the browser
 * @private
 */
function eventProxy(e) {
	return this._listeners[e.type](options.event ? options.event(e) : e);
}
