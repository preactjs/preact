import { IS_NON_DIMENSIONAL, EMPTY_OBJ } from '../constants';
import options from '../options';
import { assign } from '../util';

/**
 * Diff the old and new properties of a VNode and apply changes to the DOM node
 * @param {import('../internal').PreactElement} dom The DOM node to apply
 * changes to
 * @param {object} newProps The new props
 * @param {object} oldProps The old props
 * @param {boolean} isSvg Whether or not this node is an SVG node
 */
export function diffProps(dom, newProps, oldProps, isSvg) {
	let i;

	const keys = Object.keys(newProps).sort();
	for (i = 0; i < keys.length; i++) {
		const k = keys[i];
		if (k!=='children' && k!=='key' && (!oldProps || ((k==='value' || k==='checked') ? dom : oldProps)[k]!==newProps[k])) {
			setProperty(dom, k, newProps[k], oldProps[k], isSvg);
		}
	}

	for (i in oldProps) {
		if (i!=='children' && i!=='key' && !(i in newProps)) {
			setProperty(dom, i, null, oldProps[i], isSvg);
		}
	}
}

const CAMEL_REG = /[A-Z]/g;
const XLINK_NS = 'http://www.w3.org/1999/xlink';

/**
 * Set a property value on a DOM node
 * @param {import('../internal').PreactElement} dom The DOM node to modify
 * @param {string} name The name of the property to set
 * @param {*} value The value to set the property to
 * @param {*} oldValue The old value the property had
 * @param {boolean} isSvg Whether or not this DOM node is an SVG node or not
 */
function setProperty(dom, name, value, oldValue, isSvg) {
	name = isSvg ? (name==='className' ? 'class' : name) : (name==='class' ? 'className' : name);

	if (name==='style') {
		const set = assign(assign({}, oldValue), value);
		for (let i in set) {
			if ((value || EMPTY_OBJ)[i] === (oldValue || EMPTY_OBJ)[i]) {
				continue;
			}
			dom.style.setProperty(
				(i[0] === '-' && i[1] === '-') ? i : i.replace(CAMEL_REG, '-$&'),
				(value && (i in value))
					? (typeof set[i]==='number' && IS_NON_DIMENSIONAL.test(i)===false)
						? set[i] + 'px'
						: set[i]
					: ''
			);
		}
	}
	// Benchmark for comparison: https://esbench.com/bench/574c954bdb965b9a00965ac6
	else if (name[0]==='o' && name[1]==='n') {
		let useCapture = name !== (name=name.replace(/Capture$/, ''));
		let nameLower = name.toLowerCase();
		name = (nameLower in dom ? nameLower : name).slice(2);

		if (value) {
			if (!oldValue) dom.addEventListener(name, eventProxy, useCapture);
			(dom._listeners || (dom._listeners = {}))[name] = value;
		}
		else {
			dom.removeEventListener(name, eventProxy, useCapture);
		}
	}
	else if (name!=='list' && name!=='tagName' && !isSvg && (name in dom)) {
		// Setting `select.value` doesn't work in IE11.
		// Only `<select>` elements have the length property
		if (dom.length && name=='value') {
			for (name = dom.length; name--;) {
				dom.options[name].selected = dom.options[name].value==value;
			}
		}
		else {
			dom[name] = value==null ? '' : value;
		}
	}
	else if (typeof value!=='function' && name!=='dangerouslySetInnerHTML') {
		if (name!==(name = name.replace(/^xlink:?/, ''))) {
			if (value==null || value===false) {
				dom.removeAttributeNS(XLINK_NS, name.toLowerCase());
			}
			else {
				dom.setAttributeNS(XLINK_NS, name.toLowerCase(), value);
			}
		}
		else if (value==null || value===false) {
			dom.removeAttribute(name);
		}
		else {
			dom.setAttribute(name, value);
		}
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
