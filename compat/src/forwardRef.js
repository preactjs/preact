import { options } from 'preact';
import { assign } from './util';

let oldDiffHook = options._diff;
options._diff = vnode => {
	if (vnode.type && vnode.type._forwarded && vnode.ref) {
		vnode.props.ref = vnode.ref;
		vnode.ref = null;
	}
	if (oldDiffHook) oldDiffHook(vnode);
};

/**
 * Pass ref down to a child. This is mainly used in libraries with HOCs that
 * wrap components. Using `forwardRef` there is an easy way to get a reference
 * of the wrapped component instead of one of the wrapper itself.
 * @param {import('./index').ForwardFn} fn
 * @returns {import('./internal').FunctionalComponent}
 */
export function forwardRef(fn) {
	function Forwarded(props) {
		let clone = assign({}, props);
		delete clone.ref;
		return fn(clone, props.ref);
	}
	Forwarded.prototype.isReactComponent = Forwarded._forwarded = true;
	Forwarded.displayName = 'ForwardRef(' + (fn.displayName || fn.name) + ')';
	return Forwarded;
}
