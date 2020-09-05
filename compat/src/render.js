import {
	render as preactRender,
	hydrate as preactHydrate,
	options,
	toChildArray,
	Component
} from 'preact';
import { IS_NON_DIMENSIONAL } from './util';

const CAMEL_PROPS = /^(?:accent|alignment|arabic|baseline|cap|clip(?!PathU)|color|fill|flood|font|glyph(?!R)|horiz|marker(?!H|W|U)|overline|paint|stop|strikethrough|stroke|text(?!L)|underline|unicode|units|v|vector|vert|word|writing|x(?!C))[A-Z]/;

// Input types for which onchange should not be converted to oninput.
// type="file|checkbox|radio", plus "range" in IE11.
// (IE11 doesn't support Symbol, which we use here to turn `rad` into `ra` which matches "range")
const ONCHANGE_INPUT_TYPES =
	typeof Symbol != 'undefined' ? /fil|che|rad/i : /fil|che|ra/i;

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

// `UNSAFE_*` lifecycle hooks
// Preact only ever invokes the unprefixed methods.
// Here we provide a base "fallback" implementation that calls any defined UNSAFE_ prefixed method.
// - If a component defines its own `componentDidMount()` (including via defineProperty), use that.
// - If a component defines `UNSAFE_componentDidMount()`, `componentDidMount` is the alias getter/setter.
// - If anything assigns to an `UNSAFE_*` property, the assignment is forwarded to the unprefixed property.
// See https://github.com/preactjs/preact/issues/1941
[
	'componentWillMount',
	'componentWillReceiveProps',
	'componentWillUpdate'
].forEach(key => {
	const mapped = 'UNSAFE_' + key;
	Object.defineProperty(Component.prototype, key, {
		configurable: true,
		get() {
			return this[mapped];
		},
		set(v) {
			Object.defineProperty(this, key, {
				configurable: true,
				writable: true,
				value: v
			});
		}
	});
});

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

	const isComponent = typeof type == 'function';
	if (isComponent) {
		if ((classNameDescriptor.enumerable = 'className' in props)) {
			props.class = props.className;
		}
		Object.defineProperty(props, 'className', classNameDescriptor);
	} else if (type) {
		let normalizedProps = {};
		let value, valueProp, multiple;

		for (let i in props) {
			value = props[i];
			if (i === 'multiple') multiple = true;

			// Alias `class` prop to `className` if available
			if (i === 'className') {
				normalizedProps.class = value;
				classNameDescriptor.enumerable = true;
			}

			if (i === 'style' && typeof value === 'object') {
				for (let j in value) {
					if (typeof value[j] === 'number' && !IS_NON_DIMENSIONAL.test(j)) {
						value[j] += 'px';
					}
				}
			}

			if (i === 'defaultValue' && valueProp == null) {
				if ('value' in props) {
					i = 'value';
				} else {
					valueProp = value;
				}
			}

			if (i === 'value') {
				valueProp = value;
			} else if (
				/^onchange(textarea|input)/i.test(i + type) &&
				!ONCHANGE_INPUT_TYPES.test(props.type)
			) {
				i = 'oninput';
			} else if (/ondoubleclick/i.test(i)) {
				i = 'ondblclick';
			} else if (/^on(Ani|Tra|Tou|BeforeInp)/.test(i)) {
				i = i.toLowerCase();
			} else if (CAMEL_PROPS.test(i)) {
				i = i.replace(/[A-Z0-9]/, '-$&').toLowerCase();
			}

			normalizedProps[i] = value;
		}
		Object.defineProperty(normalizedProps, 'className', classNameDescriptor);

		if (valueProp != null) {
			// Add support for array select values: <select value={[]} />
			if (type === 'select' && multiple && Array.isArray(valueProp)) {
				toChildArray(props.children).forEach(child => {
					child.props.selected = valueProp.indexOf(child.props.value) != -1;
				});
			}
		}

		vnode.props = normalizedProps;
	}

	if (oldVNodeHook) oldVNodeHook(vnode);
};
