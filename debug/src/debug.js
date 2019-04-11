import { checkPropTypes } from './check-props';
import { getDisplayName } from './devtools/custom';
import { options, toChildArray } from 'preact';
import { ELEMENT_NODE, DOCUMENT_NODE, DOCUMENT_FRAGMENT_NODE } from './constants';

export function initDebug() {
	/* eslint-disable no-console */
	let oldBeforeDiff = options.diff;
	let oldDiffed = options.diffed;
	let oldVnode = options.vnode;

	options.root = (vnode, parentNode) => {
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

	options.diff = vnode => {
		let { type, props } = vnode;
		let children = props && props.children;

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

		if (typeof vnode.type!=='function') {
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
			checkPropTypes(vnode.type.propTypes, vnode.props, getDisplayName(vnode), serializeVNode(vnode));
		}

		let keys = [];
		for (let deepChild of toChildArray(children)) {
			if (!deepChild || deepChild.key==null) continue;

			let key = deepChild.key;

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

		if (oldBeforeDiff) oldBeforeDiff(vnode);
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
		Object.defineProperties(vnode, deprecatedAttributes);
		if (oldVnode) oldVnode(vnode);
	};

	options.diffed = (vnode) => {
		if (vnode._component && vnode._component.__hooks) {
			let hooks = vnode._component.__hooks;
			if (hooks._list.length > 0) {
				hooks._list.forEach(hook => {
					if (hook._callback && (!hook._args || !Array.isArray(hook._args))) {
						console.warn(
							`In ${vnode.type.name || vnode.type} you are calling useMemo/useCallback without passing arguments.\n` +
							`This is a noop since it will not be able to memoize, it will execute it every render.`
						);
					}
				});
			}
			if (hooks._pendingEffects.length > 0) {
				hooks._pendingEffects.forEach((effect) => {
					if (!effect._args || !Array.isArray(effect._args)) {
						throw new Error('You should provide an array of arguments as the second argument to the "useEffect" hook.\n\n' +
							'Not doing so will invoke this effect on every render.\n\n' +
							'This effect can be found in the render of ' + (vnode.type.name || vnode.type) + '.');
					}
				});
			}
			if (hooks._pendingLayoutEffects.length > 0) {
				hooks._pendingLayoutEffects.forEach((layoutEffect) => {
					if (!layoutEffect._args || !Array.isArray(layoutEffect._args)) {
						throw new Error('You should provide an array of arguments as the second argument to the "useEffect" hook.\n\n' +
							'Not doing so will invoke this effect on every render.\n\n' +
							'This effect can be found in the render of ' + (vnode.type.name || vnode.type) + '.');
					}
				});
			}
		}

		if (oldDiffed) oldDiffed(vnode);
	};
}

/**
 * Serialize a vnode tree to a string
 * @param {import('./internal').VNode} vnode
 * @returns {string}
 */
export function serializeVNode(vnode) {
	let { props } = vnode;
	let name = getDisplayName(vnode);

	let attrs = '';
	if (props) {
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
	}

	let children = props.children;
	return `<${name}${attrs}${children && children.length
		? '>..</'+name+'>'
		: ' />'}`;
}
