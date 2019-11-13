import {
	createElement,
	render as preactRender,
	cloneElement as preactCloneElement,
	createRef,
	Component,
	options,
	toChildArray,
	createContext,
	Fragment
} from 'preact';
import {
	useState,
	useReducer,
	useEffect,
	useLayoutEffect,
	useRef,
	useImperativeHandle,
	useMemo,
	useCallback,
	useContext,
	useDebugValue
} from 'preact/hooks';
import { Suspense, lazy } from './suspense';
import { SuspenseList } from './suspense-list';
import { createPortal } from './createPortal';
import { memo } from './memo';
import { forwardRef } from './forwardRef';
import { PureComponent } from './PureComponent';
import { Children } from './Children';

const version = '16.8.0'; // trick libraries to think we are react

/* istanbul ignore next */
const REACT_ELEMENT_TYPE =
	(typeof Symbol !== 'undefined' &&
		Symbol.for &&
		Symbol.for('react.element')) ||
	0xeac7;

const CAMEL_PROPS = /^(?:accent|alignment|arabic|baseline|cap|clip|color|fill|flood|font|glyph|horiz|marker|overline|paint|stop|strikethrough|stroke|text|underline|unicode|units|v|vector|vert|word|writing|x)[A-Z]/;

let oldEventHook = options.event;
options.event = e => {
	if (oldEventHook) e = oldEventHook(e);
	e.persist = () => {};
	return (e.nativeEvent = e);
};

/**
 * Legacy version of createElement.
 * @param {import('./internal').VNode["type"]} type The node name or Component constructor
 */
function createFactory(type) {
	return createElement.bind(null, type);
}

/**
 * Proxy render() since React returns a Component reference.
 * @param {import('./internal').VNode} vnode VNode tree to render
 * @param {import('./internal').PreactElement} parent DOM node to render vnode tree into
 * @param {() => void} [callback] Optional callback that will be called after rendering
 * @returns {import('./internal').Component | null} The root component reference or null
 */
function render(vnode, parent, callback) {
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

/**
 * Wrap `cloneElement` to abort if the passed element is not a valid element and apply
 * all vnode normalizations.
 * @param {import('./internal').VNode} element The vnode to clone
 * @param {object} props Props to add when cloning
 * @param {Array<import('./internal').ComponentChildren>} rest Optional component children
 */
function cloneElement(element) {
	if (!isValidElement(element)) return element;
	return preactCloneElement.apply(null, arguments);
}

/**
 * Check if the passed element is a valid (p)react node.
 * @param {*} element The element to check
 * @returns {boolean}
 */
function isValidElement(element) {
	return !!element && element.$$typeof === REACT_ELEMENT_TYPE;
}

/**
 * Normalize event handlers like react does. Most famously it uses `onChange` for any input element.
 * @param {import('./internal').VNode} vnode The vnode to normalize events on
 */
function applyEventNormalization({ type, props }) {
	if (!props || typeof type != 'string') return;
	let newProps = {};

	for (let i in props) {
		if (/^on(Ani|Tra)/.test(i)) {
			props[i.toLowerCase()] = props[i];
			delete props[i];
		}
		newProps[i.toLowerCase()] = i;
	}
	if (newProps.ondoubleclick) {
		props.ondblclick = props[newProps.ondoubleclick];
		delete props[newProps.ondoubleclick];
	}
	if (newProps.onbeforeinput) {
		props.onbeforeinput = props[newProps.onbeforeinput];
		delete props[newProps.onbeforeinput];
	}
	// for *textual inputs* (incl textarea), normalize `onChange` -> `onInput`:
	if (
		newProps.onchange &&
		(type === 'textarea' ||
			(type.toLowerCase() === 'input' && !/^fil|che|ra/i.test(props.type)))
	) {
		let normalized = newProps.oninput || 'oninput';
		if (!props[normalized]) {
			props[normalized] = props[newProps.onchange];
			delete props[newProps.onchange];
		}
	}
}

/**
 * Remove a component tree from the DOM, including state and event handlers.
 * @param {import('./internal').PreactElement} container
 * @returns {boolean}
 */
function unmountComponentAtNode(container) {
	if (container._children) {
		preactRender(null, container);
		return true;
	}
	return false;
}

/**
 * Get the matching DOM node for a component
 * @param {import('./internal').Component} component
 * @returns {import('./internal').PreactElement | null}
 */
function findDOMNode(component) {
	return (
		(component &&
			(component.base || (component.nodeType === 1 && component))) ||
		null
	);
}

// Some libraries like `react-virtualized` explicitly check for this.
Component.prototype.isReactComponent = {};

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
					CAMEL_PROPS.test(i) ? i.replace(/([A-Z0-9])/, '-$1').toLowerCase() : i
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

/**
 * Deprecated way to control batched rendering inside the reconciler, but we
 * already schedule in batches inside our rendering code
 * @template Arg
 * @param {(arg: Arg) => void} callback function that triggers the updated
 * @param {Arg} [arg] Optional argument that can be passed to the callback
 */
// eslint-disable-next-line camelcase
const unstable_batchedUpdates = (callback, arg) => callback(arg);

export * from 'preact/hooks';
export {
	version,
	Children,
	render,
	render as hydrate,
	unmountComponentAtNode,
	createPortal,
	createElement,
	createContext,
	createFactory,
	cloneElement,
	createRef,
	Fragment,
	isValidElement,
	findDOMNode,
	Component,
	PureComponent,
	memo,
	forwardRef,
	// eslint-disable-next-line camelcase
	unstable_batchedUpdates,
	Suspense,
	SuspenseList,
	lazy
};

// React copies the named exports to the default one.
export default {
	useState,
	useReducer,
	useEffect,
	useLayoutEffect,
	useRef,
	useImperativeHandle,
	useMemo,
	useCallback,
	useContext,
	useDebugValue,
	version,
	Children,
	render,
	hydrate: render,
	unmountComponentAtNode,
	createPortal,
	createElement,
	createContext,
	createFactory,
	cloneElement,
	createRef,
	Fragment,
	isValidElement,
	findDOMNode,
	Component,
	PureComponent,
	memo,
	forwardRef,
	unstable_batchedUpdates,
	Suspense,
	SuspenseList,
	lazy
};
