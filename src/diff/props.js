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
	for (let i in newProps) {
		if (i!=='children' && i!=='key' && (!oldProps || oldProps[i]!=newProps[i])) {
			setProperty(dom, i, newProps[i], oldProps[i], isSvg);
		}
	}
	for (let i in oldProps) {
		if (i!=='children' && i!=='key' && (!newProps || !(i in newProps))) {
			setProperty(dom, i, null, oldProps[i], isSvg);
		}
	}
}

/**
 * Set a property value on a DOM node
 * @param {import('../internal').PreactElement} dom The DOM node to modify
 * @param {string} name The name of the property to set
 * @param {*} value The value to set the property to
 * @param {*} oldValue The old value the property had
 * @param {boolean} isSvg Whether or not this DOM node is an SVG node or not
 */
function setProperty(dom, name, value, oldValue, isSvg) {
	if (name==='class' || name==='className') name = isSvg ? 'class' : 'className';

	if (name==='style') {

		/* Possible golfing activities for setting styles:
		 *   - we could just drop String style values. They're not supported in other VDOM libs.
		 *   - assigning to .style sets .style.cssText - TODO: benchmark this, might not be worth the bytes.
		 *   - assigning also casts to String, and ignores invalid values. This means assigning an Object clears all styles.
		 */
		let s = dom.style;

		if (typeof value==='string') return s.cssText = value;
		if (typeof oldValue==='string') s.cssText = '';
		else {
			// remove values not in the new list
			for (let i in oldValue) {
				if (value==null || !(i in value)) s[i] = '';
			}
		}

		for (let i in value) {
			let v = value[i];
			if (oldValue==null || v!==oldValue[i]) {
				s[i] = typeof v==='number' && IS_NON_DIMENSIONAL.test(i)===false ? (v + 'px') : v;
			}
		}
	}
	else if (name==='dangerouslySetInnerHTML') {
		// Avoid re-applying the same '__html' if it did not changed between re-render
		if (value && oldValue && value.__html==oldValue.__html) return;
		dom.innerHTML = value && value.__html || '';
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
	else if (name!=='list' && !isSvg && (name in dom)) {
		dom[name] = value==null ? '' : value;
	}
	else if (value==null || value===false) {
		dom.removeAttribute(name);
	}
	else if (typeof value!=='function') {
		dom.setAttribute(name, value);
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
