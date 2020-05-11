import { IS_NON_DIMENSIONAL } from '../constants';
import options from '../options';

/**
 * Diff the old and new properties of a VNode and apply changes to the DOM node
 * @param {import('../internal').PreactElement} dom The DOM node to apply
 * changes to
 * @param {object} newProps The new props
 * @param {object} oldProps The old props
 * @param {boolean} isSvg Whether or not this node is an SVG node
 * @param {boolean} hydrate Whether or not we are in hydration mode
 */
export function diffProps(dom, newProps, oldProps, isSvg, hydrate) {
	let i;

	for (i in oldProps) {
		if (i !== 'children' && i !== 'key' && !(i in newProps)) {
			setProperty(dom, i, null, oldProps[i], isSvg);
		}
	}

	for (i in newProps) {
		if (
			(!hydrate || typeof newProps[i] == 'function') &&
			i !== 'children' &&
			i !== 'key' &&
			i !== 'value' &&
			i !== 'checked' &&
			oldProps[i] !== newProps[i]
		) {
			setProperty(dom, i, newProps[i], oldProps[i], isSvg);
		}
	}
}

function setStyle(style, key, value) {
	if (key[0] === '-') {
		style.setProperty(key, value);
	} else if (
		typeof value == 'number' &&
		IS_NON_DIMENSIONAL.test(key) === false
	) {
		style[key] = value + 'px';
	} else if (value == null) {
		style[key] = '';
	} else {
		style[key] = value;
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
export function setProperty(dom, name, value, oldValue, isSvg) {
	let s, useCapture, nameLower;

	if (isSvg) {
		if (name === 'className') {
			name = 'class';
		}
	} else if (name === 'class') {
		name = 'className';
	}

	if (name === 'style') {
		s = dom.style;

		if (typeof value == 'string') {
			s.cssText = value;
		} else {
			if (typeof oldValue == 'string') {
				s.cssText = '';
				oldValue = null;
			}

			if (oldValue) {
				for (let i in oldValue) {
					if (!(value && i in value)) {
						setStyle(s, i, '');
					}
				}
			}

			if (value) {
				for (let i in value) {
					if (!oldValue || value[i] !== oldValue[i]) {
						setStyle(s, i, value[i]);
					}
				}
			}
		}
	}
	// Benchmark for comparison: https://esbench.com/bench/574c954bdb965b9a00965ac6
	else if (name[0] === 'o' && name[1] === 'n') {
		useCapture = name !== (name = name.replace(/Capture$/, ''));
		nameLower = name.toLowerCase();
		name = (nameLower in dom ? nameLower : name).slice(2);

		if (value) {
			if (!oldValue) dom.addEventListener(name, eventProxy, useCapture);
			(dom._listeners || (dom._listeners = {}))[name] = value;
		} else {
			dom.removeEventListener(name, eventProxy, useCapture);
		}
	} else if (
		name !== 'list' &&
		name !== 'tagName' &&
		// HTMLButtonElement.form and HTMLInputElement.form are read-only but can be set using
		// setAttribute
		name !== 'form' &&
		name !== 'type' &&
		name !== 'size' &&
		!isSvg &&
		name in dom
	) {
		dom[name] = value == null ? '' : value;
	} else if (typeof value != 'function' && name !== 'dangerouslySetInnerHTML') {
		if (name !== (name = name.replace(/^xlink:?/, ''))) {
			if (value == null || value === false) {
				dom.removeAttributeNS(
					'http://www.w3.org/1999/xlink',
					name.toLowerCase()
				);
			} else {
				dom.setAttributeNS(
					'http://www.w3.org/1999/xlink',
					name.toLowerCase(),
					value
				);
			}
		} else if (
			value == null ||
			(value === false &&
				// ARIA-attributes have a different notion of boolean values.
				// The value `false` is different from the attribute not
				// existing on the DOM, so we can't remove it. For non-boolean
				// ARIA-attributes we could treat false as a removal, but the
				// amount of exceptions would cost us too many bytes. On top of
				// that other VDOM frameworks also always stringify `false`.
				!/^ar/.test(name))
		) {
			dom.removeAttribute(name);
		} else {
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
	this._listeners[e.type](options.event ? options.event(e) : e);
}
