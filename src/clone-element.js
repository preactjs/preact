import { assign } from './util';
import { createElement } from './create-element';

/**
 * Clones the given VNode, optionally adding attributes/props and replacing its
 * children.
 * @param {import('./internal').VNode} vnode The virtual DOM element to clone
 * @param {object} props Attributes/props to add when cloning
 * @param {...Array<import('./internal').ComponentChildren>} rest Any additional arguments will be used
 * as replacement children.
 * @returns {import('./internal').VNode}
 */
export function cloneElement(vnode, props, ...rest) {
	return createElement(
		vnode.type,
		assign(
			vnode.ref ? { ref: vnode.ref } : {},
			vnode.key ? { key: vnode.key } : {},
			vnode.props,
			props
		),
		...rest
	);
}
