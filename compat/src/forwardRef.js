import { assign } from './util';

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
	Forwarded.prototype.isReactComponent = true;
	Forwarded._forwarded = true;
	Forwarded.displayName = 'ForwardRef(' + (fn.displayName || fn.name) + ')';
	return Forwarded;
}
