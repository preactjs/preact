import { assign } from './util';
import { EMPTY_ARR } from './constants';

/**
 * Clones the given VNode, optionally adding attributes/props and replacing its children.
 * @param {import('./internal').VNode} vnode The virtual DOM element to clone
 * @param {object} props Attributes/props to add when cloning
 * @param {Array<import('./index').ComponentChildren>} rest Any additional arguments will be used as replacement children.
 */
export function cloneElement(vnode, props) {
	let out = assign({}, vnode);
	out.props = assign(assign({}, out.props), props);
	if (arguments.length>2) out.props.children = EMPTY_ARR.slice.call(arguments, 2);
	return out;
}
