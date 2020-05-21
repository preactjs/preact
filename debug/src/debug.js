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

	/* eslint-disable no-console */
	let oldBeforeDiff = options._diff;
	let oldDiffed = options.diffed;
	let oldVnode = options.vnode;
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

		oldCatchError(error, vnode, oldVNode);
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

	options._diff = vnode => {
		let { type, _parent: parent } = vnode;
		let parentVNode = getClosestDomNodeParent(parent);

		if (type === undefined) {
			throw new Error(
				'Undefined component passed to createElement()\n\n' +
					'You likely forgot to export your component or might have mixed up default and named imports' +
					serializeVNode(vnode) +
					`\n\n${getOwnerStack(vnode)}`
			);
		} else if (type != null && typeof type == 'object') {
			if (type._children !== undefined && type._dom !== undefined) {
				throw new Error(
					`Invalid type passed to createElement(): ${type}\n\n` +
						'Did you accidentally pass a JSX literal as JSX twice?\n\n' +
						`  let My${getDisplayName(vnode)} = ${serializeVNode(type)};\n` +
						`  let vnode = <My${getDisplayName(vnode)} />;\n\n` +
						'This usually happens when you export a JSX literal and not the component.' +
						`\n\n${getOwnerStack(vnode)}`
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
					serializeVNode(vnode) +
					`\n\n${getOwnerStack(vnode)}`
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
					serializeVNode(vnode) +
					`\n\n${getOwnerStack(vnode)}`
			);
		} else if (type === 'td' && parentVNode.type !== 'tr') {
			console.error(
				'Improper nesting of table. Your <td> should have a <tr> parent.' +
					serializeVNode(vnode) +
					`\n\n${getOwnerStack(vnode)}`
			);
		} else if (type === 'th' && parentVNode.type !== 'tr') {
			console.error(
				'Improper nesting of table. Your <th> should have a <tr>.' +
					serializeVNode(vnode) +
					`\n\n${getOwnerStack(vnode)}`
			);
		}

		if (
			vnode.ref !== undefined &&
			typeof vnode.ref != 'function' &&
			typeof vnode.ref != 'object' &&
			!('$$typeof' in vnode) // allow string refs when preact-compat is installed
		) {
			throw new Error(
				`Component's "ref" property should be a function, or an object created ` +
					`by createRef(), but got [${typeof vnode.ref}] instead\n` +
					serializeVNode(vnode) +
					`\n\n${getOwnerStack(vnode)}`
			);
		}

		if (typeof vnode.type == 'string') {
			for (const key in vnode.props) {
				if (
					key[0] === 'o' &&
					key[1] === 'n' &&
					typeof vnode.props[key] != 'function' &&
					vnode.props[key] != null
				) {
					throw new Error(
						`Component's "${key}" property should be a function, ` +
							`but got [${typeof vnode.props[key]}] instead\n` +
							serializeVNode(vnode) +
							`\n\n${getOwnerStack(vnode)}`
					);
				}
			}
		}

		// Check prop-types if available
		if (typeof vnode.type == 'function' && vnode.type.propTypes) {
			if (
				vnode.type.displayName === 'Lazy' &&
				warnedComponents &&
				!warnedComponents.lazyPropTypes.has(vnode.type)
			) {
				const m =
					'PropTypes are not supported on lazy(). Use propTypes on the wrapped component itself. ';
				try {
					const lazyVNode = vnode.type();
					warnedComponents.lazyPropTypes.set(vnode.type, true);
					console.warn(
						m + `Component wrapped in lazy() is ${getDisplayName(lazyVNode)}`
					);
				} catch (promise) {
					console.warn(
						m + "We will log the wrapped component's name once it is loaded."
					);
				}
			}
			checkPropTypes(
				vnode.type.propTypes,
				vnode.props,
				'prop',
				getDisplayName(vnode)
			);
		}

		if (oldBeforeDiff) oldBeforeDiff(vnode);
	};

	options._hook = (comp, index, type) => {
		if (!comp) {
			throw new Error('Hook can only be invoked from render methods.');
		}

		if (oldHook) oldHook(comp, index, type);
	};

	const warn = (property, err) => ({
		get() {
			console.warn(`getting vnode.${property} is deprecated, ${err}`);
		},
		set() {
			console.warn(`setting vnode.${property} is not allowed, ${err}`);
		}
	});

	const deprecatedAttributes = {
		nodeName: warn('nodeName', 'use vnode.type'),
		attributes: warn('attributes', 'use vnode.props'),
		children: warn('children', 'use vnode.props.children')
	};

	const deprecatedProto = Object.create({}, deprecatedAttributes);

	options.vnode = vnode => {
		const props = vnode.props;
		if (
			vnode.type !== null &&
			props != null &&
			('__source' in props || '__self' in props)
		) {
			const newProps = (vnode.props = {});
			for (let i in props) {
				const v = props[i];
				if (i === '__source') vnode.__source = v;
				else if (i === '__self') vnode.__self = v;
				else newProps[i] = v;
			}
		}
		// eslint-disable-next-line
		vnode.__proto__ = deprecatedProto;
		if (oldVnode) oldVnode(vnode);
	};

	options.diffed = vnode => {
		// Check if the user passed plain objects as children. Note that we cannot
		// move this check into `options.vnode` because components can receive
		// children in any shape they want (e.g.
		// `<MyJSONFormatter>{{ foo: 123, bar: "abc" }}</MyJSONFormatter>`).
		// Putting this check in `options.diffed` ensures that
		// `vnode._children` is set and that we only validate the children
		// that were actually rendered.
		if (vnode._children) {
			vnode._children.forEach(child => {
				if (child && child.type === undefined) {
					// Remove internal vnode keys that will always be patched
					delete child._parent;
					delete child._depth;
					const keys = Object.keys(child).join(',');
					throw new Error(
						`Objects are not valid as a child. Encountered an object with the keys {${keys}}.` +
							`\n\n${getOwnerStack(vnode)}`
					);
				}
			});
		}

		/** @type {import('./internal').Component} */
		const component = vnode._component;
		if (component && component.__hooks) {
			let hooks = component.__hooks;
			if (Array.isArray(hooks._list)) {
				hooks._list.forEach(hook => {
					if (hook._factory && (!hook._args || !Array.isArray(hook._args))) {
						let componentName = getDisplayName(vnode);
						console.warn(
							`In ${componentName} you are calling useMemo/useCallback without passing arguments.\n` +
								`This is a noop since it will not be able to memoize, it will execute it every render.` +
								`\n\n${getOwnerStack(vnode)}`
						);
					}
				});
			}
		}

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
