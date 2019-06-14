/**
 * Flatten a virtual nodes children to a single dimensional array
 * @param {import('../index').ComponentChildren} children The unflattened
 * children of a virtual node
 * @param {Array<import('../internal').VNode | null>} [flattened] An flat array of children to modify
 * @param {typeof import('../create-element').coerceToVNode} [map] Function that
 * will be applied on each child if the `vnode` is not `null`
 * @param {boolean} [keepHoles] wether to coerce `undefined` to `null` or not.
 * This is needed for Components without children like `<Foo />`.
 */
export function toChildArray(children, flattened, map, keepHoles) {
	if (flattened == null) flattened = [];
	if (children==null || typeof children === 'boolean') {
		if (keepHoles) flattened.push(null);
	}
	else if (Array.isArray(children)) {
		for (let i=0; i < children.length; i++) {
			toChildArray(children[i], flattened, map, keepHoles);
		}
	}
	else {
		flattened.push(map ? map(children) : children);
	}

	return flattened;
}
