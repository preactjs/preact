import { clone, extend, toArray } from './util';
import { h } from './h';

export function cloneElement(vnode, props) {
	return h(
		vnode.nodeName,
		extend(clone(vnode.attributes), props),
		arguments.length>2 ? toArray(arguments, 2) : vnode.children
	);
}
