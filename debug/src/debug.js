import { checkPropTypes } from './check-props';
import { getDisplayName } from './devtools/custom';
import { options, Component } from 'preact';
import { ELEMENT_NODE, DOCUMENT_NODE, DOCUMENT_FRAGMENT_NODE } from './constants';

function getClosestDomNodeParent(parent) {
	if (!parent) return {};
	if (typeof parent.type === 'function') {
		return getClosestDomNodeParent(parent._parent);
	}
	return parent;
}

export function initDebug() {
	/* eslint-disable no-console */
	let oldBeforeDiff = options._diff;
	let oldDiffed = options.diffed;
	let oldVnode = options.vnode;
	let oldCatchError = options._catchError;
	const warnedComponents = { useEffect: {}, useLayoutEffect: {}, lazyPropTypes: {} };

	options._catchError = (error, vnode, oldVNode) => {
		let component = vnode && vnode._component;
		if (component && typeof error.then === 'function') {
			const promise = error;
			error = new Error('Missing Suspense. The throwing component was: ' + getDisplayName(vnode));

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
			throw new Error('Undefined parent passed to render(), this is the second argument.\nCheck if the element is available in the DOM/has the correct id.');
		}
		let isValid;
		switch (parentNode.nodeType) {
			case ELEMENT_NODE:
			case DOCUMENT_FRAGMENT_NODE:
			case DOCUMENT_NODE: isValid = true; break;
			default: isValid = false;
		}
		if (!isValid) throw new Error(`
			Expected a valid HTML node as a second argument to render.
			Received ${parentNode} instead: render(<${vnode.type.name || vnode.type} />, ${parentNode});
		`);
	};

	options._diff = vnode => {
		let { type, _parent: parent } = vnode;
		let parentVNode = getClosestDomNodeParent(parent);

		if (type===undefined) {
			throw new Error('Undefined component passed to createElement()\n\n'+
			'You likely forgot to export your component or might have mixed up default and named imports'+
			serializeVNode(vnode));
		}
		else if (type!=null && typeof type==='object') {
			if (type._lastDomChild!==undefined && type._dom!==undefined) {
				let info = 'Did you accidentally pass a JSX literal as JSX twice?\n\n'+
				'  let My'+getDisplayName(type)+' = '+serializeVNode(type)+';\n'+
				'  let vnode = <My'+getDisplayName(type)+' />;\n\n'+
				'This usually happens when you export a JSX literal and not the component.';
				throw new Error('Invalid type passed to createElement(): '+type+'\n\n'+info+'\n');
			}

			throw new Error('Invalid type passed to createElement(): '+(Array.isArray(type) ? 'array' : type));
		}

		if ((type==='thead' || type==='tfoot' || type==='tbody') && parentVNode.type!=='table') {
			console.error(
				'Improper nesting of table.' +
				'Your <thead/tbody/tfoot> should have a <table> parent.'
				+ serializeVNode(vnode)
			);
		}
		else if (
			type==='tr' && (
				parentVNode.type!=='thead' &&
				parentVNode.type!=='tfoot' &&
				parentVNode.type!=='tbody' &&
				parentVNode.type!=='table'
			)) {
			console.error(
				'Improper nesting of table.' +
				'Your <tr> should have a <thead/tbody/tfoot/table> parent.'
				+ serializeVNode(vnode)
			);
		}
		else if (type==='td' && parentVNode.type!=='tr') {
			console.error(
				'Improper nesting of table.' +
					'Your <td> should have a <tr> parent.'
					+ serializeVNode(vnode)
			);
		}
		else if (type==='th' && parentVNode.type!=='tr') {
			console.error(
				'Improper nesting of table.' +
				'Your <th> should have a <tr>.'
				+ serializeVNode(vnode)
			);
		}

		if (
			vnode.ref!==undefined &&
			typeof vnode.ref!=='function' &&
			typeof vnode.ref!=='object' &&
			!('$$typeof' in vnode)  // allow string refs when preact-compat is installed
		) {
			throw new Error(
				`Component's "ref" property should be a function, or an object created ` +
				`by createRef(), but got [${typeof vnode.ref}] instead\n` +
				serializeVNode(vnode)
			);
		}

		if (typeof vnode.type==='string') {
			for (const key in vnode.props) {
				if (key[0]==='o' && key[1]==='n' && typeof vnode.props[key]!=='function' && vnode.props[key]!=null) {
					throw new Error(
						`Component's "${key}" property should be a function, ` +
						`but got [${typeof vnode.props[key]}] instead\n` +
						serializeVNode(vnode)
					);
				}
			}
		}

		// Check prop-types if available
		if (typeof vnode.type==='function' && vnode.type.propTypes) {
			if (vnode.type.displayName === 'Lazy' && !warnedComponents.lazyPropTypes[vnode.type]) {
				const m = 'PropTypes are not supported on lazy(). Use propTypes on the wrapped component itself. ';
				try {
					const lazyVNode = vnode.type();
					warnedComponents.lazyPropTypes[vnode.type] = true;
					console.warn(m + 'Component wrapped in lazy() is ' + (lazyVNode.type.displayName || lazyVNode.type.name));
				}
				catch (promise) {
					console.warn(m + 'We will log the wrapped component\'s name once it is loaded.');
				}
			}
			checkPropTypes(vnode.type.propTypes, vnode.props, getDisplayName(vnode), serializeVNode(vnode));
		}

		if (oldBeforeDiff) oldBeforeDiff(vnode);
	};

	options._hook = (comp) => {
		if (!comp) {
			throw new Error('Hook can only be invoked from render methods.');
		}
	};

	const warn = (property, err) => ({
		get() {
			throw new Error(`getting vnode.${property} is deprecated, ${err}`);
		},
		set() {
			throw new Error(`setting vnode.${property} is not allowed, ${err}`);
		}
	});

	const deprecatedAttributes = {
		nodeName: warn('nodeName', 'use vnode.type'),
		attributes: warn('attributes', 'use vnode.props'),
		children: warn('children', 'use vnode.props.children')
	};

	options.vnode = (vnode) => {
		let source, self;
		if (vnode.props && vnode.props.__source) {
			source = vnode.props.__source;
			delete vnode.props.__source;
		}
		if (vnode.props && vnode.props.__self) {
			self = vnode.props.__self;
			delete vnode.props.__self;
		}
		vnode.__self = self;
		vnode.__source = source;
		Object.defineProperties(vnode, deprecatedAttributes);
		if (oldVnode) oldVnode(vnode);
	};

	options.diffed = (vnode) => {
		// Check if the user passed plain objects as children. Note that we cannot
		// move this check into `options.vnode` because components can receive
		// children in any shape they want (e.g.
		// `<MyJSONFormatter>{{ foo: 123, bar: "abc" }}</MyJSONFormatter>`).
		// Putting this check in `options.diffed` ensures that
		// `vnode._children` is set and that we only validate the children
		// that were actually rendered.
		if (vnode._children) {
			vnode._children.forEach(child => {
				if (child && child.type===undefined) {
					// Remove internal vnode keys that will always be patched
					delete child._parent;
					delete child._depth;
					const keys = Object.keys(child).join(',');
					throw new Error(`Objects are not valid as a child. Encountered an object with the keys {${keys}}.`);
				}
			});
		}

		if (oldDiffed) oldDiffed(vnode);

		if (vnode._component && vnode._component.__hooks) {
			let hooks = vnode._component.__hooks;
			(hooks._list || []).forEach(hook => {
				if (hook._callback && (!hook._args || !Array.isArray(hook._args))) {
					/* istanbul ignore next */
					console.warn(
						`In ${vnode.type.name || vnode.type} you are calling useMemo/useCallback without passing arguments.\n` +
						`This is a noop since it will not be able to memoize, it will execute it every render.`
					);
				}
			});
			if (hooks._pendingEffects && Array.isArray(hooks._pendingEffects)) {
				hooks._pendingEffects.forEach((effect) => {
					if ((!effect._args || !Array.isArray(effect._args)) && !warnedComponents.useEffect[vnode.type]) {
						warnedComponents.useEffect[vnode.type] = true;
						/* istanbul ignore next */
						console.warn('You should provide an array of arguments as the second argument to the "useEffect" hook.\n\n' +
							'Not doing so will invoke this effect on every render.\n\n' +
							'This effect can be found in the render of ' + (vnode.type.name || vnode.type) + '.');
					}
				});
			}
			if (hooks._pendingLayoutEffects && Array.isArray(hooks._pendingLayoutEffects)) {
				hooks._pendingLayoutEffects.forEach((layoutEffect) => {
					if ((!layoutEffect._args || !Array.isArray(layoutEffect._args)) && !warnedComponents.useLayoutEffect[vnode.type]) {
						warnedComponents.useLayoutEffect[vnode.type] = true;
						/* istanbul ignore next */
						console.warn('You should provide an array of arguments as the second argument to the "useLayoutEffect" hook.\n\n' +
							'Not doing so will invoke this effect on every render.\n\n' +
							'This effect can be found in the render of ' + (vnode.type.name || vnode.type) + '.');
					}
				});
			}
		}

		if (vnode._children != null) {
			const keys = [];
			for (let i = 0; i < vnode._children.length; i++) {
				const child = vnode._children[i];
				if (!child || child.key==null) continue;

				const key = child.key;
				if (keys.indexOf(key) !== -1) {
					console.error(
						'Following component has two or more children with the ' +
						`same key attribute: "${key}". This may cause glitches and misbehavior ` +
						'in rendering process. Component: \n\n' +
						serializeVNode(vnode)
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
	if (this._vnode==null) {
		console.warn(
			`Calling "this.setState" inside the constructor of a component is a ` +
			`no-op and might be a bug in your application. Instead, set ` +
			`"this.state = {}" directly.`
		);
	}
	return setState.call(this, update, callback);
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
		if (props.hasOwnProperty(prop) && prop!=='children') {
			let value = props[prop];

			// If it is an object but doesn't have toString(), use Object.toString
			if (typeof value==='function') {
				value = `function ${value.displayName || value.name}() {}`;
			}

			value = Object(value) === value && !value.toString
				? Object.prototype.toString.call(value)
				: value + '';

			attrs += ` ${prop}=${JSON.stringify(value)}`;
		}
	}

	let children = props.children;
	return `<${name}${attrs}${children && children.length
		? '>..</'+name+'>'
		: ' />'}`;
}
