import { checkPropTypes } from './check-props';
import { options, Component } from 'preact';
import {
	ELEMENT_NODE,
	DOCUMENT_NODE,
	DOCUMENT_FRAGMENT_NODE
} from './constants';
import {
	getOwnerStack,
	setupComponentStack,
	getCurrentVNode,
	getDisplayName
} from './component-stack';
import { assign } from './util';

const isWeakMapSupported = typeof WeakMap == 'function';

function getClosestDomNodeParent(parent) {
	if (!parent) return {};
	if (typeof parent.type == 'function') {
		return getClosestDomNodeParent(parent._parent);
	}
	return parent;
}

export function initDebug() {
	setupComponentStack();

	let hooksAllowed = false;

	/* eslint-disable no-console */
	let oldBeforeDiff = options._diff;
	let oldDiffed = options.diffed;
	let oldVnode = options.vnode;
	let oldInternal = options._internal;
	let oldCatchError = options._catchError;
	let oldRoot = options._root;
	let oldHook = options._hook;
	const warnedComponents = !isWeakMapSupported
		? null
		: {
				useEffect: new WeakMap(),
				useLayoutEffect: new WeakMap(),
				lazyPropTypes: new WeakMap()
		  };
	const deprecations = [];

	options._catchError = (error, vnode, oldVNode) => {
		let component = vnode && vnode._component;
		if (component && typeof error.then == 'function') {
			const promise = error;
			error = new Error(
				`Missing Suspense. The throwing component was: ${getDisplayName(vnode)}`
			);

			let parent = vnode;
			for (; parent; parent = parent._parent) {
				if (parent._component && parent._component._childDidSuspend) {
					error = promise;
					break;
				}
			}

			// We haven't recovered and we know at this point that there is no
			// Suspense component higher up in the tree
			if (error instanceof Error) {
				throw error;
			}
		}

		try {
			oldCatchError(error, vnode, oldVNode);

			// when an error was handled by an ErrorBoundary we will nontheless emit an error
			// event on the window object. This is to make up for react compatibility in dev mode
			// and thus make the Next.js dev overlay work.
			if (typeof error.then != 'function') {
				setTimeout(() => {
					throw error;
				});
			}
		} catch (e) {
			throw e;
		}
	};

	options._root = (vnode, parentNode) => {
		if (!parentNode) {
			throw new Error(
				'Undefined parent passed to render(), this is the second argument.\n' +
					'Check if the element is available in the DOM/has the correct id.'
			);
		}

		let isValid;
		switch (parentNode.nodeType) {
			case ELEMENT_NODE:
			case DOCUMENT_FRAGMENT_NODE:
			case DOCUMENT_NODE:
				isValid = true;
				break;
			default:
				isValid = false;
		}

		if (!isValid) {
			let componentName = getDisplayName(vnode);
			throw new Error(
				`Expected a valid HTML node as a second argument to render.	Received ${parentNode} instead: render(<${componentName} />, ${parentNode});`
			);
		}

		if (oldRoot) oldRoot(vnode, parentNode);
	};

	options._diff = (internal, vnode) => {
		let { type, _parent: parent } = internal;
		let parentVNode = getClosestDomNodeParent(parent);

		hooksAllowed = true;

		if (type === undefined) {
			throw new Error(
				'Undefined component passed to createElement()\n\n' +
					'You likely forgot to export your component or might have mixed up default and named imports' +
					serializeVNode(internal) +
					`\n\n${getOwnerStack(internal)}`
			);
		} else if (type != null && typeof type == 'object') {
			if (type.constructor === undefined) {
				throw new Error(
					`Invalid type passed to createElement(): ${type}\n\n` +
						'Did you accidentally pass a JSX literal as JSX twice?\n\n' +
						`  let My${getDisplayName(internal)} = ${serializeVNode(type)};\n` +
						`  let vnode = <My${getDisplayName(internal)} />;\n\n` +
						'This usually happens when you export a JSX literal and not the component.' +
						`\n\n${getOwnerStack(internal)}`
				);
			}

			throw new Error(
				'Invalid type passed to createElement(): ' +
					(Array.isArray(type) ? 'array' : type)
			);
		}

		if (
			(type === 'thead' || type === 'tfoot' || type === 'tbody') &&
			parentVNode.type !== 'table'
		) {
			console.error(
				'Improper nesting of table. Your <thead/tbody/tfoot> should have a <table> parent.' +
					serializeVNode(internal) +
					`\n\n${getOwnerStack(internal)}`
			);
		} else if (
			type === 'tr' &&
			parentVNode.type !== 'thead' &&
			parentVNode.type !== 'tfoot' &&
			parentVNode.type !== 'tbody' &&
			parentVNode.type !== 'table'
		) {
			console.error(
				'Improper nesting of table. Your <tr> should have a <thead/tbody/tfoot/table> parent.' +
					serializeVNode(internal) +
					`\n\n${getOwnerStack(internal)}`
			);
		} else if (type === 'td' && parentVNode.type !== 'tr') {
			console.error(
				'Improper nesting of table. Your <td> should have a <tr> parent.' +
					serializeVNode(internal) +
					`\n\n${getOwnerStack(internal)}`
			);
		} else if (type === 'th' && parentVNode.type !== 'tr') {
			console.error(
				'Improper nesting of table. Your <th> should have a <tr>.' +
					serializeVNode(internal) +
					`\n\n${getOwnerStack(internal)}`
			);
		}

		if (
			internal.ref !== undefined &&
			typeof internal.ref != 'function' &&
			typeof internal.ref != 'object' &&
			!('$$typeof' in internal) // allow string refs when preact-compat is installed
		) {
			throw new Error(
				`Component's "ref" property should be a function, or an object created ` +
					`by createRef(), but got [${typeof internal.ref}] instead\n` +
					serializeVNode(internal) +
					`\n\n${getOwnerStack(internal)}`
			);
		}

		if (typeof internal.type == 'string') {
			for (const key in internal.props) {
				if (
					key[0] === 'o' &&
					key[1] === 'n' &&
					typeof internal.props[key] != 'function' &&
					internal.props[key] != null
				) {
					throw new Error(
						`Component's "${key}" property should be a function, ` +
							`but got [${typeof internal.props[key]}] instead\n` +
							serializeVNode(internal) +
							`\n\n${getOwnerStack(internal)}`
					);
				}
			}
		}

		// Check prop-types if available
		if (typeof internal.type == 'function' && internal.type.propTypes) {
			if (
				internal.type.displayName === 'Lazy' &&
				warnedComponents &&
				!warnedComponents.lazyPropTypes.has(internal.type)
			) {
				const m =
					'PropTypes are not supported on lazy(). Use propTypes on the wrapped component itself. ';
				try {
					const lazyVNode = internal.type();
					warnedComponents.lazyPropTypes.set(internal.type, true);
					console.warn(
						m + `Component wrapped in lazy() is ${getDisplayName(lazyVNode)}`
					);
				} catch (promise) {
					console.warn(
						m + "We will log the wrapped component's name once it is loaded."
					);
				}
			}

			// If vnode is not present we're mounting
			let values = vnode ? vnode.props : internal.props;
			if (internal.type._forwarded) {
				values = assign({}, values);
				delete values.ref;
			}

			checkPropTypes(
				internal.type.propTypes,
				values,
				'prop',
				getDisplayName(internal),
				() => getOwnerStack(internal)
			);
		}

		if (oldBeforeDiff) oldBeforeDiff(internal, vnode);
	};

	options._hook = (comp, index, type) => {
		if (!comp || !hooksAllowed) {
			throw new Error('Hook can only be invoked from render methods.');
		}

		if (oldHook) oldHook(comp, index, type);
	};

	// Ideally we'd want to print a warning once per component, but we
	// don't have access to the vnode that triggered it here. As a
	// compromise and to avoid flooding the console with warnings we
	// print each deprecation warning only once.
	const warn = (property, message) => ({
		get() {
			const key = 'get' + property + message;
			if (deprecations && deprecations.indexOf(key) < 0) {
				deprecations.push(key);
				console.warn(`getting vnode.${property} is deprecated, ${message}`);
			}
		},
		set() {
			const key = 'set' + property + message;
			if (deprecations && deprecations.indexOf(key) < 0) {
				deprecations.push(key);
				console.warn(`setting vnode.${property} is not allowed, ${message}`);
			}
		}
	});

	const deprecatedAttributes = {
		nodeName: warn('nodeName', 'use vnode.type'),
		attributes: warn('attributes', 'use vnode.props'),
		children: warn('children', 'use vnode.props.children')
	};

	// Property descriptor: preserve a property's value but make it non-enumerable:
	const debugProps = {
		__source: { enumerable: false },
		__self: { enumerable: false }
	};

	// If it's acceptable to inject debug properties onto the
	// prototype, __proto__ is faster than defineProperties():
	// https://esbench.com/bench/6021ebd7d9c27600a7bfdba3
	const deprecatedProto = Object.create({}, deprecatedAttributes);

	options.vnode = vnode => {
		const props = vnode.props;
		if (props != null && ('__source' in props || '__self' in props)) {
			Object.defineProperties(props, debugProps);
			vnode.__source = props.__source;
			vnode.__self = props.__self;
		}

		// eslint-disable-next-line
		vnode.__proto__ = deprecatedProto;
		if (oldVnode) oldVnode(vnode);
	};

	options._internal = (internal, vnode) => {
		if (typeof vnode !== 'string') {
			// Check if the user passed plain objects as children. Note that we cannot
			// move this check into `options.vnode` because components can receive
			// children in any shape they want (e.g.
			// `<MyJSONFormatter>{{ foo: 123, bar: "abc" }}</MyJSONFormatter>`).
			if (vnode.constructor !== undefined) {
				const keys = Object.keys(vnode).join(',');
				throw new Error(
					`Objects are not valid as a child. Encountered an object with the keys {${keys}}.` +
						`\n\n${getOwnerStack(vnode)}`
				);
			}
		}

		if (oldInternal) oldInternal(internal, vnode);
	};

	options.diffed = vnode => {
		hooksAllowed = false;

		if (oldDiffed) oldDiffed(vnode);

		if (vnode._children != null) {
			const keys = [];
			for (let i = 0; i < vnode._children.length; i++) {
				const child = vnode._children[i];
				if (!child || child.key == null) continue;

				const key = child.key;
				if (keys.indexOf(key) !== -1) {
					console.error(
						'Following component has two or more children with the ' +
							`same key attribute: "${key}". This may cause glitches and misbehavior ` +
							'in rendering process. Component: \n\n' +
							serializeVNode(vnode) +
							`\n\n${getOwnerStack(vnode)}`
					);

					// Break early to not spam the console
					break;
				}

				keys.push(key);
			}
		}
	};
}

const setState = Component.prototype.setState;
Component.prototype.setState = function(update, callback) {
	if (this._vnode == null) {
		// `this._vnode` will be `null` during componentWillMount. But it
		// is perfectly valid to call `setState` during cWM. So we
		// need an additional check to verify that we are dealing with a
		// call inside constructor.
		if (this.state == null) {
			console.warn(
				`Calling "this.setState" inside the constructor of a component is a ` +
					`no-op and might be a bug in your application. Instead, set ` +
					`"this.state = {}" directly.\n\n${getOwnerStack(getCurrentVNode())}`
			);
		}
	} else if (this._parentDom == null) {
		console.warn(
			`Can't call "this.setState" on an unmounted component. This is a no-op, ` +
				`but it indicates a memory leak in your application. To fix, cancel all ` +
				`subscriptions and asynchronous tasks in the componentWillUnmount method.` +
				`\n\n${getOwnerStack(this._vnode)}`
		);
	}

	return setState.call(this, update, callback);
};

const forceUpdate = Component.prototype.forceUpdate;
Component.prototype.forceUpdate = function(callback) {
	if (this._vnode == null) {
		console.warn(
			`Calling "this.forceUpdate" inside the constructor of a component is a ` +
				`no-op and might be a bug in your application.\n\n${getOwnerStack(
					getCurrentVNode()
				)}`
		);
	} else if (this._parentDom == null) {
		console.warn(
			`Can't call "this.forceUpdate" on an unmounted component. This is a no-op, ` +
				`but it indicates a memory leak in your application. To fix, cancel all ` +
				`subscriptions and asynchronous tasks in the componentWillUnmount method.` +
				`\n\n${getOwnerStack(this._vnode)}`
		);
	}
	return forceUpdate.call(this, callback);
};

/**
 * Serialize a vnode tree to a string
 * @param {import('./internal').VNode} vnode
 * @returns {string}
 */
export function serializeVNode(vnode) {
	let { props } = vnode;
	let name = getDisplayName(vnode);

	let attrs = '';
	for (let prop in props) {
		if (props.hasOwnProperty(prop) && prop !== 'children') {
			let value = props[prop];

			// If it is an object but doesn't have toString(), use Object.toString
			if (typeof value == 'function') {
				value = `function ${value.displayName || value.name}() {}`;
			}

			value =
				Object(value) === value && !value.toString
					? Object.prototype.toString.call(value)
					: value + '';

			attrs += ` ${prop}=${JSON.stringify(value)}`;
		}
	}

	let children = props.children;
	return `<${name}${attrs}${
		children && children.length ? '>..</' + name + '>' : ' />'
	}`;
}
