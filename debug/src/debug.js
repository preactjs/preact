import { checkPropTypes } from 'prop-types';
import { getDisplayName } from './devtools/custom';
import { options, toChildArray } from 'preact';
import { ELEMENT_NODE, DOCUMENT_NODE, DOCUMENT_FRAGMENT_NODE } from './constants';

export function initDebug() {
	/* eslint-disable no-console */
	let oldBeforeDiff = options.diff;

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

		for (const key in vnode.props) {
			if (key[0]==='o' && key[1]==='n' && typeof vnode.props[key]!=='function') {
				throw new Error(
					`Component's "${key}" property should be a function,
					but got [${typeof vnode.props[key]}] instead\n` +
					serializeVNode(vnode)
				);
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
