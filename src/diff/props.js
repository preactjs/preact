import options from '../options';

function setStyle(dom, key, value) {
	if (key[0] === '-') {
		dom.style.setProperty(key, value);
	} else {
		dom.style[key] = value == null ? '' : value;
	}
}

/**
 * Set a property value on a DOM node
 * @param {import('../internal').PreactElement} dom The DOM node to modify
 * @param {string} name The name of the property to set
 * @param {*} value The value to set the property to
 * @param {*} oldValue The old value the property had
 * @param {number} isSvg 0 if not an SVG element, else it is an SVG element
 */
export function setProperty(dom, name, value, oldValue, isSvg) {
	let useCapture;

	o: if (name === 'style') {
		if (typeof value == 'string') {
			setStyle(dom, 'cssText', value);
		} else {
			if (typeof oldValue == 'string') {
				setStyle(dom, 'cssText', (oldValue = ''));
			}

			if (oldValue) {
				for (name in oldValue) {
					if (!value || !(name in value)) {
						setStyle(dom, name, '');
					}
				}
			}

			for (name in value) {
				if (!oldValue || value[name] !== oldValue[name]) {
					setStyle(dom, name, value[name]);
				}
			}
		}
	}
	// Benchmark for comparison: https://esbench.com/bench/574c954bdb965b9a00965ac6
	else if (name[0] === 'o' && name[1] === 'n') {
		useCapture = name !== (name = name.replace(/Capture$/, ''));

		// Infer correct casing for DOM built-in events:
		if (name.toLowerCase() in dom) name = name.toLowerCase().slice(2);
		else name = name.slice(2);

		if (!dom._listeners) dom._listeners = {};
		dom._listeners[name + useCapture] = value;

		if (value) {
			if (!oldValue) {
				const handler = useCapture ? eventProxyCapture : eventProxy;
				dom.addEventListener(name, handler, useCapture);
			}
		} else {
			const handler = useCapture ? eventProxyCapture : eventProxy;
			dom.removeEventListener(name, handler, useCapture);
		}
	} else if (name !== 'dangerouslySetInnerHTML') {
		if (isSvg) {
			// Normalize incorrect prop usage for SVG:
			// - xlink:href / xlinkHref --> href (xlink:href was removed from SVG and isn't needed)
			// - className --> class
			name = name.replace(/xlink[H:h]/, 'h').replace(/sName$/, 's');
		} else if (
			name !== 'href' &&
			name !== 'list' &&
			name !== 'form' &&
			// Default value in browsers is `-1` and an empty string is
			// cast to `0` instead
			name !== 'tabIndex' &&
			name !== 'download' &&
			name in dom
		) {
			try {
				dom[name] = value == null ? '' : value;
				// labelled break is 1b smaller here than a return statement (sorry)
				break o;
			} catch (e) {}
		}

		// ARIA-attributes have a different notion of boolean values.
		// The value `false` is different from the attribute not
		// existing on the DOM, so we can't remove it. For non-boolean
		// ARIA-attributes we could treat false as a removal, but the
		// amount of exceptions would cost us too many bytes. On top of
		// that other VDOM frameworks also always stringify `false`.

		if (typeof value === 'function') {
			// never serialize functions as attribute values
		} else if (
			value != null &&
			(value !== false || (name[0] === 'a' && name[1] === 'r'))
		) {
			dom.setAttribute(name, value);
		} else {
			dom.removeAttribute(name);
		}
	}
}

/**
 * Proxy an event to hooked event handlers
 * @param {Event} e The event object from the browser
 * @private
 */
function eventProxy(e) {
	this._listeners[e.type + false](options.event ? options.event(e) : e);
}

function eventProxyCapture(e) {
	this._listeners[e.type + true](options.event ? options.event(e) : e);
}
