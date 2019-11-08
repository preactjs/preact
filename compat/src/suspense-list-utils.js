/**
 * Checks if the parent has __suspenseWillResolve then
 * will delegate the callback and vnode to the parent to allow extra wait.
 * @param {import('../src/internal').VNode} vnode
 * @param {function} cb
 */
export function suspenseWillResolve(vnode, cb) {
	if (
		vnode._parent._component &&
		vnode._parent._component.__suspenseWillResolve
	) {
		vnode._parent._component.__suspenseWillResolve(vnode, cb);
	} else {
		cb();
	}
}

/**
 * Notifies the parent SuspenseList that the child
 * SuspenseBoundary has been resolved
 * @param {import('../src/internal').VNode} vnode
 */
export function suspenseDidResolve(vnode) {
	if (
		vnode._parent._component &&
		vnode._parent._component.__suspenseDidResolve
	) {
		vnode._parent._component.__suspenseDidResolve(vnode);
	}
}
