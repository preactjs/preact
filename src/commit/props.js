import { IS_NON_DIMENSIONAL } from '../constants';
import options from '../options';

function setStyle(style, key, value) {
	if (key[0] === '-') {
		style.setProperty(key, value);
	} else if (
		typeof value === 'number' &&
		IS_NON_DIMENSIONAL.test(key) === false
	) {
		style[key] = value + 'px';
	} else if (value == null) {
		style[key] = '';
	} else {
		style[key] = value;
	}
}

export function commitPropUpdates(dom, updates, isSvg) {
	for (const update of updates) {
		const value = update.value;
		let name = update.name;
		let oldValue = update.oldValue;

		if (isSvg) {
			if (name === 'className') {
				name = 'class';
			}
		} else if (name === 'class') {
			name = 'className';
		}

		if (name == 'style') {
			const s = dom.style;

			if (typeof value === 'string') {
				s.cssText = value;
			} else {
				if (typeof oldValue === 'string') {
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
		} else if (name[0] === 'o' && name[1] === 'n') {
			let useCapture = name !== (name = name.replace(/Capture$/, ''));
			let nameLower = name.toLowerCase();
			name = (nameLower in dom ? nameLower : name).slice(2);
			if (value) {
				if (!oldValue) {
					dom.addEventListener(name, eventProxy, useCapture);
				}
				(dom._listeners || (dom._listeners = {}))[name] = value;
			} else {
				dom.removeEventListener(name, eventProxy, useCapture);
			}
		} else if (
			name !== 'list' &&
			name !== 'tagName' &&
			name !== 'form' &&
			!isSvg &&
			name in dom
		) {
			dom[name] = value == null ? '' : value;
		} else if (name === 'dangerouslySetInnerHTML') {
			dom.innerHTML = value;
		} else if (name !== (name = name.replace(/^xlink:?/, ''))) {
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
		} else if (value == null || value === false) {
			dom.removeAttribute(name);
		} else if (typeof value !== 'function') {
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
