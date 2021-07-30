import { MODE_SVG, TYPE_ELEMENT } from './constants';
import options from './options';
import { HAS_LISTENERS } from './preact-vm';

const EVENT_LISTENERS = new WeakMap();
const EMPTY_ELEMENT = document.createElement('template');

/**
 * @param {Event} e
 * @returns {*}
 */
function eventProxy(e) {
	return EVENT_LISTENERS.get(this)[e.type](
		options.event ? options.event(e) : e
	);
}

/**
 * @param {Event} e
 * @returns {*}
 */
function eventProxyCapture(e) {
	return EVENT_LISTENERS.get(this)[e.type + 'c'](
		options.event ? options.event(e) : e
	);
}

/**
 * @param {*} style
 * @param {string} key
 * @param {string | number | null | undefined} value
 */
function setStyle(style, key, value) {
	if (key[0] === '-') {
		style.setProperty(key, value);
	} else if (value == null) {
		style[key] = '';
	} else {
		style[key] = value;
	}
}

/**
 * @type {import('./internal').Renderer}
 */
export class DOMRenderer {
	createInstance(internal) {
		internal.dom = EMPTY_ELEMENT;
	}

	insertBefore(internal, parent, before) {
		parent.insertBefore(internal.dom, before);
	}

	createText(value) {
		return document.createTextNode(value);
	}

	updateText(internal, value) {
		internal.dom.data = value;
	}

	createElement(internal) {
		return internal.flags & MODE_SVG
			? document.createElementNS(
					'http://www.w3.org/2000/svg',
					// @ts-ignore We know `newVNode.type` is a string
					internal.type
			  )
			: document.createElement(
					internal.type,
					internal.props && internal.props.is && internal.props
			  );
	}

	remove(internal, skipRemove) {
		const dom = internal.dom;
		const flags = internal.flags;

		if (flags & TYPE_ELEMENT) {
			if (!skipRemove) {
				skipRemove = true;
				dom.remove();

				if (flags & HAS_LISTENERS) {
					const listeners = EVENT_LISTENERS.get(dom);
					EVENT_LISTENERS.delete(dom);

					for (let i in listeners) {
						dom.removeEventListener(i, eventProxy);
					}
				}
			}
		} else {
			// Must be a Text
			dom.remove();
		}

		internal.dom = EMPTY_ELEMENT;
	}

	setProperty(internal, name, value, oldValue) {
		/** @type {HTMLElement} */
		const dom = /** @type {*} */ (internal.dom);
		const flags = internal.flags;
		name = name === 'class' ? 'className' : name;

		if (name === 'style' && typeof value !== 'string') {
			if (typeof oldValue == 'string') {
				dom.style.cssText = oldValue = '';
			}

			if (oldValue) {
				for (name in oldValue) {
					if (!(value && name in value)) {
						setStyle(dom.style, name, '');
					}
				}
			}

			if (value) {
				for (name in value) {
					if (!oldValue || value[name] !== oldValue[name]) {
						setStyle(dom.style, name, value[name]);
					}
				}
			}
			return;
		}

		if (name[0] === 'o' && name[1] === 'n') {
			let useCapture = name !== (name = name.replace(/Capture$/, ''));
			// If the lower-cased event name is defined as a property, we use that name instead:
			let lc = name.toLowerCase();
			name = lc in dom ? lc.slice(2) : name.slice(2);

			const handler = useCapture ? eventProxyCapture : eventProxy;
			if (!oldValue && value) {
				dom.addEventListener(name, handler, useCapture);
			} else if (!value) {
				dom.removeEventListener(name, handler, useCapture);
			}

			name = useCapture ? name + 'c' : name;

			let listeners = EVENT_LISTENERS.get(dom);
			if (!listeners) {
				listeners = {};
				EVENT_LISTENERS.set(dom, listeners);
			}
			listeners[name] = value;
			return;
		}

		if (flags & MODE_SVG) {
			// Normalize xlinkHref and className to class
			name = name.replace(/xlink[H:h]/, 'h').replace(/sName$/, 's');
		} else if (name in dom) {
			// Note that we don't take this branch for SVG (we always set attributes)
			if (setUserProperty(dom, name, value)) return;
		}
		// Finally, set as an attribute. This means either we're in SVG mode,
		// or the prop name wasn't defined as a property of the element, or assigning to it threw.
		if (typeof value !== 'function') {
			if (name === 'dangerouslySetInnerHTML') {
				if (value) {
					const html = value.__html;
					if (
						!oldValue ||
						(html !== oldValue.__html && html !== dom.innerHTML)
					) {
						dom.innerHTML = value;
					}
				} else if (oldValue) {
					dom.innerHTML = '';
				}
			} else if (value == null || value === false) {
				dom.removeAttribute(name);
			} else {
				dom.setAttribute(name, value);
			}
		}
	}
}

let set = false;
/**
 *
 * @param {*} dom
 * @param {string} property
 * @param {any} value
 * @returns {boolean}
 */
function setUserProperty(dom, property, value) {
	set = false;
	try {
		dom[property] = value;
		set = true;
	} catch (e) {}
	return set;
}
