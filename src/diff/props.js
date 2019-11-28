import { IS_NON_DIMENSIONAL } from '../constants';
import options from '../options';

const diffProp = (vnode, name, newValue, oldValue) => {
	if (name === 'key' || name === 'children') {
	} else if (name[0] === 'o' && name[1] === 'n') {
		vnode._updates.push({ name, value: newValue, oldValue });
	} else if (name === 'dangerouslySetInnerHTML') {
		if (newValue || oldValue) {
			if (!newValue || !oldValue || newValue.__html != oldValue.__html) {
				vnode._updates.push({
					name,
					value: (newValue && newValue.__html) || '',
					oldValue: null
				});
			}
		}
	} else if (typeof value !== 'function') {
		vnode._updates.push({
			name,
			value: name !== 'style' && newValue == null ? undefined : newValue,
			oldValue
		});
	}
};

/**
 * Diff the old and new properties of a VNode and apply changes to the DOM node
 * @param {import('../internal').PreactElement} dom The DOM node to apply
 * changes to
 * @param {object} newProps The new props
 * @param {object} oldProps The old props
 * @param {boolean} isSvg Whether or not this node is an SVG node
 * @param {boolean} hydrate Whether or not we are in hydration mode
 */
export function diffProps(vnode, newProps, oldProps, isSvg, hydrate) {
	let i;

	for (i in oldProps) {
		if (!(i in newProps)) {
			diffProp(vnode, i, null, oldProps[i]);
		}
	}

	for (i in newProps) {
		if (
			(!hydrate || typeof newProps[i] == 'function') &&
			i !== 'value' &&
			i !== 'checked' &&
			oldProps[i] !== newProps[i]
		) {
			diffProp(vnode, i, newProps[i], oldProps[i]);
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
