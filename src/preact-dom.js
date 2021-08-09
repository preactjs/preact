import { MODE_SVG, TYPE_ELEMENT } from './constants';
import options from './options';
import { HAS_LISTENERS } from './preact-vm';

const EVENT_LISTENERS = new WeakMap();
const EMPTY_ELEMENT = document.createElement('template');

const CSSPROP = /(?=[A-Z])/g;
const nmap = {};

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
		if (internal.flags & MODE_SVG) {
			return document.createElementNS(
				'http://www.w3.org/2000/svg',
				internal.type
			);
		}
		if (internal.props && internal.props.is) {
			return document.createElement(internal.type, internal.props);
		}
		return document.createElement(internal.type);
	}

	remove(internal) {
		const dom = internal.dom;
		const flags = internal.flags;

		if (flags & TYPE_ELEMENT) {
			dom.remove();

			if (flags & HAS_LISTENERS) {
				const listeners = EVENT_LISTENERS.get(dom);
				EVENT_LISTENERS.delete(dom);

				for (let i in listeners) {
					dom.removeEventListener(i, eventProxy);
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
			let style = '',
				sep = '',
				spacer = ' ';
			for (let i in value) {
				let v = value[i];
				if (typeof v === 'number') v = String(v);
				if (v) {
					const n = i in nmap ? nmap[i] : (nmap[i] = i.replace(CSSPROP, '-'));
					style = style + sep + n + ':' + v + ';';
					sep = spacer;
				}
			}
			dom.style.cssText = style;

			return;
		}

		if (name === 'dangerouslySetInnerHTML') {
			if (value) {
				const html = value.__html;
				if (!oldValue || (html !== oldValue.__html && html !== dom.innerHTML)) {
					dom.innerHTML = value;
				}
			} else if (oldValue) {
				dom.innerHTML = '';
			}
			return;
		}

		if (name[0] === 'o' && name[1] === 'n') {
			let useCapture = name !== (name = name.replace(/Capture$/, ''));
			// If the lower-cased event name is defined as a property, we use that name instead:
			let lc = name.toLowerCase();
			name = (lc in dom ? lc : name).slice(2);

			const handler = useCapture ? eventProxyCapture : eventProxy;
			if (!oldValue && value) {
				dom.addEventListener(name, handler, useCapture);
			} else if (!value) {
				dom.removeEventListener(name, handler, useCapture);
			}

			if (useCapture) name += 'c';

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
			try {
				dom[name] = value;
				return;
			} catch (e) {}
		}

		// Finally, set as an attribute. This means either we're in SVG mode,
		// or the prop name wasn't defined as a property of the element, or assigning to it threw.
		if (value == null || value === false) {
			dom.removeAttribute(name);
		} else if (typeof value !== 'function') {
			dom.setAttribute(name, value);
		}
	}
}
