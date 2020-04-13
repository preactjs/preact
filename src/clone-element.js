import { assign } from './util';
import { EMPTY_ARR } from './constants';
import { createVNode } from './create-element';

/**
 * Clones the given VNode, optionally adding attributes/props and replacing its children.
 * @param {import('./internal').VNode} vnode The virtual DOM element to clone
 * @param {object} props Attributes/props to add when cloning
 * @param {Array<import('./index').ComponentChildren>} rest Any additional arguments will be used as replacement children.
 * @returns {import('./internal').VNode}
 */
export function cloneElement(vnode, props) {
	props = assign(assign({}, vnode.props), props);
	if (arguments.length > 2) props.children = EMPTY_ARR.slice.call(arguments, 2);
	let normalizedProps = {};
	for (const i in props) {
		if (i !== 'key' && i !== 'ref') normalizedProps[i] = props[i];
	}

	return createVNode(
		vnode.type,
		normalizedProps,
		props.key || vnode.key,
		props.ref || vnode.ref,
		null
	);
}
