import {
	render as preactRender,
	createElement as preactCreateElement,
	options,
	toChildArray,
	Component
} from 'preact';
import { applyEventNormalization } from './events';

const CAMEL_PROPS = /^(?:accent|alignment|arabic|baseline|cap|clip|color|fill|flood|font|glyph|horiz|marker|overline|paint|stop|strikethrough|stroke|text|underline|unicode|units|v|vector|vert|word|writing|x)[A-Z]/;

/* istanbul ignore next */
export const REACT_ELEMENT_TYPE =
	(typeof Symbol !== 'undefined' &&
		Symbol.for &&
		Symbol.for('react.element')) ||
	0xeac7;

export function createElement() {
	if (!isReactCompatInstalled) {
		installReactCompat();
	}

	return preactCreateElement.apply(null, arguments);
}

/**
 * Proxy render() since React returns a Component reference.
 * @param {import('./internal').VNode} vnode VNode tree to render
 * @param {import('./internal').PreactElement} parent DOM node to render vnode tree into
 * @param {() => void} [callback] Optional callback that will be called after rendering
 * @returns {import('./internal').Component | null} The root component reference or null
 */
export function render(vnode, parent, callback) {
	if (!isReactCompatInstalled) {
		installReactCompat();
	}

	// React destroys any existing DOM nodes, see #1727
	// ...but only on the first render, see #1828
	if (parent._children == null) {
		while (parent.firstChild) {
			parent.removeChild(parent.firstChild);
		}
	}

	preactRender(vnode, parent);
	if (typeof callback === 'function') callback();

	return vnode ? vnode._component : null;
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

const classNameDescriptor = {
	configurable: true,
	get() {
		return this.class;
	}
};

let isReactCompatInstalled = false;
function installReactCompat() {
	// Some libraries like `react-virtualized` explicitly check for this.
	Component.prototype.isReactComponent = {};

	let oldEventHook = options.event;
	options.event = e => {
		if (oldEventHook) e = oldEventHook(e);
		e.persist = () => {};
		return (e.nativeEvent = e);
	};

	let oldVNodeHook = options.vnode;
	options.vnode = vnode => {
		vnode.$$typeof = REACT_ELEMENT_TYPE;

		let type = vnode.type;
		let props = vnode.props;

		// Apply DOM VNode compat
		if (typeof type != 'function') {
			// Apply defaultValue to value
			if (props.defaultValue) {
				if (!props.value && props.value !== 0) {
					props.value = props.defaultValue;
				}
				delete props.defaultValue;
			}

			// Add support for array select values: <select value={[]} />
			if (Array.isArray(props.value) && props.multiple && type === 'select') {
				toChildArray(props.children).forEach(child => {
					if (props.value.indexOf(child.props.value) != -1) {
						child.props.selected = true;
					}
				});
				delete props.value;
			}

			// Normalize DOM vnode properties.
			let shouldSanitize, attrs, i;
			for (i in props) if ((shouldSanitize = CAMEL_PROPS.test(i))) break;
			if (shouldSanitize) {
				attrs = vnode.props = {};
				for (i in props) {
					attrs[
						CAMEL_PROPS.test(i)
							? i.replace(/([A-Z0-9])/, '-$1').toLowerCase()
							: i
					] = props[i];
				}
			}
		}

		// Alias `class` prop to `className` if available
		if (props.class || props.className) {
			classNameDescriptor.enumerable = 'className' in props;
			if (props.className) props.class = props.className;
			Object.defineProperty(props, 'className', classNameDescriptor);
		}

		// Events
		applyEventNormalization(vnode);

		// Component base class compat
		// We can't just patch the base component class, because components that use
		// inheritance and are transpiled down to ES5 will overwrite our patched
		// getters and setters. See #1941
		if (
			typeof type === 'function' &&
			!type._patchedLifecycles &&
			type.prototype
		) {
			setSafeDescriptor(type.prototype, 'componentWillMount');
			setSafeDescriptor(type.prototype, 'componentWillReceiveProps');
			setSafeDescriptor(type.prototype, 'componentWillUpdate');
			type._patchedLifecycles = true;
		}

		if (oldVNodeHook) oldVNodeHook(vnode);
	};

	isReactCompatInstalled = true;
}
