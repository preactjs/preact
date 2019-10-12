/**
 * Flatten and loop through the children of a virtual node
 * @param {import('../index').ComponentChildren} children The unflattened
 * children of a virtual node
 * @param {(vnode: import('../internal').VNode) => import('../internal').VNode} [callback]
 * A function to invoke for each child before it is added to the flattened list.
 * @param {import('../internal').VNode[]} [flattened] An flat array of children to modify
 * @returns {import('../internal').VNode[]}
 */
export function toChildArray(children, callback, flattened) {
	if (flattened == null) flattened = [];

	if (children==null || typeof children === 'boolean') {
		if (callback) flattened.push(callback(null));
	}
	else if (Array.isArray(children)) {
		for (let i=0; i < children.length; i++) {
			toChildArray(children[i], callback, flattened);
		}
	}
	else {
		// TODO: we dropped a coerceToVNode here...
		flattened.push(callback ? callback((children)) : children);
	}

	return flattened;
}
