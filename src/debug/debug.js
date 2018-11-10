import { options } from '../index';

/* eslint-disable no-console */
let oldBeforeDiff = options.beforeDiff;

options.beforeDiff = vnode => {
	let { type, props } = vnode;
	let children = props && props.children;

	if (type===undefined) {
		throw new Error('Undefined component passed to createElement()\n'+serializeVNode(vnode));
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

	let keys = {};

	inspectChildren(children, deepChild => {
		if (!deepChild || deepChild.key==null) return;

		// In Preact, all keys are stored as object values, i.e. being strings
		let key = deepChild.key + '';

		if (keys.hasOwnProperty(key)) {
			console.error(
				'Following component has two or more children with the ' +
				'same "key" attribute. This may cause glitches and misbehavior ' +
				'in rendering process. Component: \n\n' +
				serializeVNode(vnode)
			);

			// Return early to not spam the console
			return true;
		}

		keys[key] = true;
	});

	if (oldBeforeDiff) oldBeforeDiff(vnode);
};

function inspectChildren(children, inspect) {
	if (!Array.isArray(children)) children = [children];

	return children.some((child, i) => Array.isArray(child)
		? inspectChildren(child, inspect)
		: inspect(child, i)
	);
}

/**
 * Serialize a vnode tree to a string
 * @param {import('../index').VNode} vnode
 * @returns {string}
 */
export function serializeVNode(vnode) {
	let { type, props } = vnode;
	if (typeof type==='function') {
		type = type.name || type.displayName;
	}

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
	return `<${type}${attrs}${children && children.length
		? '>..</'+type+'>'
		: ' />'}`;
}
