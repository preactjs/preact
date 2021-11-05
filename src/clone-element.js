import { createVNode } from './create-element';

/**
 * Clones the given VNode, optionally adding attributes/props and replacing its children.
 * @param {import('./internal').VNode} vnode The virtual DOM element to clone
 * @param {object} props Attributes/props to add when cloning
 * @param {Array<import('./internal').ComponentChildren>} rest Any additional arguments will be used as replacement children.
 * @returns {import('./internal').VNode}
 */
export function cloneElement(vnode, props, children) {
	let normalizedProps = Object.assign({}, vnode.props),
		key,
		ref,
		i;
	for (i in props) {
		if (!(i === 'key' || (typeof vnode.type !== 'function' && i === 'ref'))) {
			normalizedProps[i] = props[i];
		} else if (i === 'key') {
			key = props[i];
		} else if (i === 'ref') {
			ref = props[i];
		}
	}

	if (arguments.length > 3) {
		children = [children];
		for (i = 3; i < arguments.length; i++) {
			children.push(arguments[i]);
		}
	}

	if (arguments.length > 2) {
		normalizedProps.children = children;
	}

	return createVNode(
		vnode.type,
		normalizedProps,
		key || vnode.key,
		ref || vnode.ref,
		0
	);
}
