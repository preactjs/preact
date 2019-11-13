import { options } from 'preact';
import { assign } from './util';

export let isForwardRefInstalled = false;
export function installForwardRef() {
	let oldVNodeHook = options.vnode;
	options.vnode = vnode => {
		if (vnode.type && vnode.type._forwarded && vnode.ref) {
			vnode.props.ref = vnode.ref;
			vnode.ref = null;
		}

		if (oldVNodeHook) oldVNodeHook(vnode);
	};

	isForwardRefInstalled = true;
}

/**
 * Pass ref down to a child. This is mainly used in libraries with HOCs that
 * wrap components. Using `forwardRef` there is an easy way to get a reference
 * of the wrapped component instead of one of the wrapper itself.
 * @param {import('./index').ForwardFn} fn
 * @returns {import('./internal').FunctionalComponent}
 */
export function forwardRef(fn) {
	if (!isForwardRefInstalled) {
		installForwardRef();
	}

	function Forwarded(props) {
		let clone = assign({}, props);
		delete clone.ref;
		return fn(clone, props.ref);
	}
	Forwarded.prototype.isReactComponent = true;
	Forwarded._forwarded = true;
	Forwarded.displayName = 'ForwardRef(' + (fn.displayName || fn.name) + ')';
	return Forwarded;
}
