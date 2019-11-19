import { IS_NON_DIMENSIONAL } from '../constants';
import options from '../options';

/**
 * Diff the old and new properties of a VNode and apply changes to the DOM node
 * @param {import('../internal').VNode} vnode
 * changes to
 * @param {object} newProps The new props
 * @param {object} oldProps The old props
 * @param {boolean} hydrate Whether or not we are in hydration mode
 */
export function diffProps(vnode, newProps, oldProps, hydrate) {
	let i;

	for (i in oldProps) {
		if (!(i in newProps)) {
			diffProperty(vnode, i, null, oldProps[i]);
		}
	}

	for (i in newProps) {
		if (
			(!hydrate || typeof newProps[i] == 'function') &&
			i !== 'value' &&
			i !== 'checked' &&
			oldProps[i] !== newProps[i]
		) {
			diffProperty(vnode, i, newProps[i], oldProps[i]);
		}
	}
}

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

/**
 * Add diffed props to the vnode's update queue
 * @param {import('../internal').VNode} vnode
 * @param {string} name
 * @param {*} value
 * @param {*} oldValue
 */
function pushUpdate(vnode, name, value, oldValue) {
	(vnode._updateQueue = vnode._updateQueue || []).push(name, value, oldValue);
}

/**
 * Set a property value on a DOM node
 * @param {import('../internal').VNode} vnode
 * @param {string} name The name of the property to set
 * @param {*} value The value to set the property to
 * @param {*} oldValue The old value the property had
 */
function diffProperty(vnode, name, value, oldValue) {
	if (name === 'key' || name === 'children') {
	}
	// Benchmark for comparison: https://esbench.com/bench/574c954bdb965b9a00965ac6
	else if (name[0] === 'o' && name[1] === 'n') {
		pushUpdate(vnode, name, value, oldValue);
	} else if (name === 'dangerouslySetInnerHTML') {
		if (value || oldValue) {
			// Avoid re-applying the same '__html' if it did not changed between re-render
			if (!value || !oldValue || value.__html != oldValue.__html) {
				pushUpdate(vnode, name, (value && value.__html) || '', null);
			}
		}
	} else if (typeof value !== 'function') {
		pushUpdate(
			vnode,
			name,
			name !== 'style' && value == null ? undefined : value,
			oldValue
		);
	}
}

/**
 * Write updates to the DOM
 * @param {import('../internal').PreactElement} dom
 * @param {any[]} updates
 * @param {boolean} isSvg Whether or not this DOM node is an SVG node or not
 */
export function commitProps(dom, updates, isSvg) {
	let name, value, oldValue;
	for (let i = 0; i < updates.length; i += 3) {
		name = updates[i];
		value = updates[i + 1];
		oldValue = updates[i + 2];

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
			// HTMLButtonElement.form and HTMLInputElement.form are read-only but can be set using
			// setAttribute
			name !== 'form' &&
			name !== 'type' &&
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
