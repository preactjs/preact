import {
	render as preactRender,
	hydrate as preactHydrate,
	options,
	toChildArray,
	Component
} from 'preact';
import { IS_NON_DIMENSIONAL } from './util';

const CAMEL_PROPS = /^(?:accent|alignment|arabic|baseline|cap|clip(?!PathU)|color|fill|flood|font|glyph(?!R)|horiz|marker(?!H|W|U)|overline|paint|stop|strikethrough|stroke|text(?!L)|underline|unicode|units|v|vector|vert|word|writing|x(?!C))[A-Z]/;

// Some libraries like `react-virtualized` explicitly check for this.
Component.prototype.isReactComponent = {};

export const REACT_ELEMENT_TYPE =
	(typeof Symbol != 'undefined' && Symbol.for && Symbol.for('react.element')) ||
	0xeac7;

/**
 * Proxy render() since React returns a Component reference.
 * @param {import('./internal').VNode} vnode VNode tree to render
 * @param {import('./internal').PreactElement} parent DOM node to render vnode tree into
 * @param {() => void} [callback] Optional callback that will be called after rendering
 * @returns {import('./internal').Component | null} The root component reference or null
 */
export function render(vnode, parent, callback) {
	// React destroys any existing DOM nodes, see #1727
	// ...but only on the first render, see #1828
	if (parent._children == null) {
		while (parent.firstChild) {
			parent.removeChild(parent.firstChild);
		}
	}

	preactRender(vnode, parent);
	if (typeof callback == 'function') callback();

	return vnode ? vnode._component : null;
}

export function hydrate(vnode, parent, callback) {
	preactHydrate(vnode, parent);
	if (typeof callback == 'function') callback();

	return vnode ? vnode._component : null;
}

let oldEventHook = options.event;
options.event = e => {
	if (oldEventHook) e = oldEventHook(e);
	e.persist = empty;
	e.isPropagationStopped = isPropagationStopped;
	e.isDefaultPrevented = isDefaultPrevented;
	return (e.nativeEvent = e);
};

function empty() {}

function isPropagationStopped() {
	return this.cancelBubble;
}

function isDefaultPrevented() {
	return this.defaultPrevented;
}

// Patch in `UNSAFE_*` lifecycle hooks
function setSafeDescriptor(proto, key) {
	if (proto['UNSAFE_' + key] && !proto[key]) {
		Object.defineProperty(proto, key, {
			configurable: false,
			get() {
				return this['UNSAFE_' + key];
			},
			// This `set` is only used if a user sets a lifecycle like cWU
			// after setting a lifecycle like UNSAFE_cWU. I doubt anyone
			// actually does this in practice so not testing it
			/* istanbul ignore next */
			set(v) {
				this['UNSAFE_' + key] = v;
			}
		});
	}
}

let classNameDescriptor = {
	configurable: true,
	get() {
		return this.class;
	}
};

let oldVNodeHook = options.vnode;
options.vnode = vnode => {
	vnode.$$typeof = REACT_ELEMENT_TYPE;

	let type = vnode.type;
	let props = vnode.props;
	let proto;

	const isComponent = typeof type == 'function';
	if (isComponent) {
		classNameDescriptor.enumerable = 'className' in props;
		Object.defineProperty(props, 'className', classNameDescriptor);

		// Component base class compat
		// We can't just patch the base component class, because components that use
		// inheritance and are transpiled down to ES5 will overwrite our patched
		// getters and setters. See #1941
		if (!type._patchedLifecycles && (proto = type.prototype)) {
			setSafeDescriptor(proto, 'componentWillMount');
			setSafeDescriptor(proto, 'componentWillReceiveProps');
			setSafeDescriptor(proto, 'componentWillUpdate');
			type._patchedLifecycles = true;
		}
	} else if (type) {
		let normalizedProps = {};
		let value, hasClass, valueProp, multiple;

		for (let i in props) {
			value = props[i];
			if (i === 'class') hasClass = true;
			if (i === 'multiple') multiple = true;

			// Alias `class` prop to `className` if available
			if (i === 'className') {
				if (!hasClass) normalizedProps.class = value;
				classNameDescriptor.enumerable = true;
			}

			if (i === 'style' && typeof value === 'object') {
				for (let j in value) {
					if (typeof value[j] === 'number' && !IS_NON_DIMENSIONAL.test(j)) {
						value[j] += 'px';
					}
				}
			}

			/*if (isComponent) {
				normalizedProps[i] = value;
			} else*/
			if (i === 'defaultValue') {
				if (valueProp == null) {
					valueProp = value;
				}
			} else if (i === 'value') {
				if (value != null) {
					valueProp = value;
				}
			} else {
				if (
					i === 'onchange' &&
					/textarea|input(fil|che|ra)/i.test(type + props.type)
				) {
					i = 'oninput';
				} else if (i === 'ondoubleclick') {
					i = 'ondblclick';
				} else if (/^on(Ani|Tra|Tou|BeforeInp|Cha)/.test(i)) {
					i = i.toLowerCase();
				} else if (CAMEL_PROPS.test(i)) {
					i = i.replace(/[A-Z0-9]/, '-$&').toLowerCase();
				}

				normalizedProps[i] = value;
			}
		}
		Object.defineProperty(normalizedProps, 'className', classNameDescriptor);

		if (valueProp != null) {
			// Add support for array select values: <select value={[]} />
			if (type === 'select' && multiple && Array.isArray(valueProp)) {
				toChildArray(props.children).forEach(child => {
					child.props.selected = valueProp.indexOf(child.props.value);
				});
			} else {
				normalizedProps.value = valueProp;
			}
		}
	}

	if (oldVNodeHook) oldVNodeHook(vnode);
};
