import { options } from 'preact';

let oldDiffHook = options._diff;
options._diff = (internal, vnode) => {
	if (internal.type && internal.type._forwarded && vnode.ref) {
		vnode.props.ref = vnode.ref;
		vnode.ref = null;
		internal.ref = null;
	}
	if (oldDiffHook) oldDiffHook(internal, vnode);
};

export const REACT_FORWARD_SYMBOL = Symbol.for('react.forward_ref');

/**
 * Pass ref down to a child. This is mainly used in libraries with HOCs that
 * wrap components. Using `forwardRef` there is an easy way to get a reference
 * of the wrapped component instead of one of the wrapper itself.
 * @param {import('./index').ForwardFn} fn
 * @returns {import('./internal').FunctionComponent}
 */
export function forwardRef(fn) {
	function Forwarded(props) {
		let clone = Object.assign({}, props);
		delete clone.ref;
		return fn(clone, props.ref || null);
	}

	// mobx-react checks for this being present
	Forwarded.$$typeof = REACT_FORWARD_SYMBOL;
	// mobx-react heavily relies on implementation details.
	// It expects an object here with a `render` property,
	// and prototype.render will fail. Without this
	// mobx-react throws.
	Forwarded.render = Forwarded;

	Forwarded.prototype.isReactComponent = Forwarded._forwarded = true;
	Forwarded.displayName = 'ForwardRef(' + (fn.displayName || fn.name) + ')';
	return Forwarded;
}
