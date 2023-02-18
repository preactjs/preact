import {
	render as preactRender,
	hydrate as preactHydrate,
	options,
	toChildArray,
	Component
} from 'preact';

export const REACT_ELEMENT_TYPE =
	(typeof Symbol != 'undefined' && Symbol.for && Symbol.for('react.element')) ||
	0xeac7;

const CAMEL_PROPS = /^(?:accent|alignment|arabic|baseline|cap|clip(?!PathU)|color|dominant|fill|flood|font|glyph(?!R)|horiz|image|letter|lighting|marker(?!H|W|U)|overline|paint|pointer|shape|stop|strikethrough|stroke|text(?!L)|transform|underline|unicode|units|v|vector|vert|word|writing|x(?!C))[A-Z]/;
const DOUBLE_CLICK = /ondoubleclick/;
const CHANGE_INPUT = /^onchange(textarea|input)/;
const ON_ANI = /^on(Ani|Tra|Tou|BeforeInp|Compo)/;
const ON_BLUR = /^onblur$/;
const ON_FOCUS = /^onfocus$/;
const ON_INPUT = /^oninput$/;
const CAMEL_REPLACE = /[A-Z0-9]/g;

const IS_DOM = typeof document !== 'undefined';

// Input types for which onchange should not be converted to oninput.
// type="file|checkbox|radio", plus "range" in IE11.
// (IE11 doesn't support Symbol, which we use here to turn `rad` into `ra` which matches "range")
const onChangeInputType = type =>
	(typeof Symbol != 'undefined' && typeof Symbol() == 'symbol'
		? /fil|che|rad/
		: /fil|che|ra/
	).test(type);

// Some libraries like `react-virtualized` explicitly check for this.
Component.prototype.isReactComponent = {};

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
	Object.defineProperty(Component.prototype, key, {
		configurable: true,
		get() {
			return this['UNSAFE_' + key];
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
		parent.textContent = '';
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

let classNameDescriptor = {
	configurable: true,
	get() {
		return this.class;
	}
};

let oldVNodeHook = options.vnode;
options.vnode = vnode => {
	let type = vnode.type;
	let props = vnode.props;
	let normalizedProps = props;

	// only normalize props on Element nodes
	if (typeof type === 'string') {
		normalizedProps = {};

		for (let i in props) {
			let value = props[i];

			if (
				(i === 'value' && 'defaultValue' in props && value == null) ||
				// Emulate React's behavior of not rendering the contents of noscript tags on the client.
				(IS_DOM && i === 'children' && type === 'noscript')
			) {
				// Skip applying value if it is null/undefined and we already set
				// a default value
				continue;
			}

			let lowerCased = i.toLowerCase();
			if (i === 'defaultValue' && 'value' in props && props.value == null) {
				// `defaultValue` is treated as a fallback `value` when a value prop is present but null/undefined.
				// `defaultValue` for Elements with no value prop is the same as the DOM defaultValue property.
				i = 'value';
			} else if (i === 'download' && value === true) {
				// Calling `setAttribute` with a truthy value will lead to it being
				// passed as a stringified value, e.g. `download="true"`. React
				// converts it to an empty string instead, otherwise the attribute
				// value will be used as the file name and the file will be called
				// "true" upon downloading it.
				value = '';
			} else if (DOUBLE_CLICK.test(lowerCased)) {
				i = 'ondblclick';
			} else if (
				CHANGE_INPUT.test(lowerCased + type) &&
				!onChangeInputType(props.type)
			) {
				lowerCased = i = 'oninput';
			} else if (ON_FOCUS.test(lowerCased)) {
				i = 'onfocusin';
			} else if (ON_BLUR.test(lowerCased)) {
				i = 'onfocusout';
			} else if (ON_ANI.test(i)) {
				i = i.toLowerCase();
			} else if (type.indexOf('-') === -1 && CAMEL_PROPS.test(i)) {
				i = i.replace(CAMEL_REPLACE, '-$&').toLowerCase();
			} else if (value === null) {
				value = undefined;
			}

			// Add support for onInput and onChange, see #3561
			// if we have an oninput prop already change it to oninputCapture
			if (ON_INPUT.test(lowerCased)) {
				i = lowerCased;
				if (normalizedProps[i]) {
					i = 'oninputCapture';
				}
			}

			normalizedProps[i] = value;
		}

		// Add support for array select values: <select multiple value={[]} />
		if (
			type == 'select' &&
			normalizedProps.multiple &&
			Array.isArray(normalizedProps.value)
		) {
			// forEach() always returns undefined, which we abuse here to unset the value prop.
			normalizedProps.value = toChildArray(props.children).forEach(child => {
				child.props.selected =
					normalizedProps.value.indexOf(child.props.value) != -1;
			});
		}

		// Adding support for defaultValue in select tag
		if (type == 'select' && normalizedProps.defaultValue != null) {
			normalizedProps.value = toChildArray(props.children).forEach(child => {
				if (normalizedProps.multiple) {
					child.props.selected =
						normalizedProps.defaultValue.indexOf(child.props.value) != -1;
				} else {
					child.props.selected =
						normalizedProps.defaultValue == child.props.value;
				}
			});
		}

		vnode.props = normalizedProps;

		if (props.class != props.className) {
			classNameDescriptor.enumerable = 'className' in props;
			if (props.className != null) normalizedProps.class = props.className;
			Object.defineProperty(normalizedProps, 'className', classNameDescriptor);
		}
	}

	vnode.$$typeof = REACT_ELEMENT_TYPE;

	if (oldVNodeHook) oldVNodeHook(vnode);
};

// Only needed for react-relay
let currentComponent;
const oldBeforeRender = options._render;
options._render = function(vnode) {
	if (oldBeforeRender) {
		oldBeforeRender(vnode);
	}
	currentComponent = vnode._component;
};

const oldDiffed = options.diffed;
/** @type {(vnode: import('./internal').VNode)} */
options.diffed = function(vnode) {
	if (oldDiffed) {
		oldDiffed(vnode);
	}

	const props = vnode.props;
	const dom = vnode._dom;
	if (
		dom != null &&
		vnode.type === 'textarea' &&
		'value' in props &&
		props.value !== dom.value
	) {
		dom.value = props.value == null ? '' : props.value;
	}

	currentComponent = null;
};

// This is a very very private internal function for React it
// is used to sort-of do runtime dependency injection. So far
// only `react-relay` makes use of it. It uses it to read the
// context value.
export const __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = {
	ReactCurrentDispatcher: {
		current: {
			readContext(context) {
				return currentComponent._globalContext[context._id].props.value;
			}
		}
	}
};
