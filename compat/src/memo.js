import { createElement } from 'preact';
import { shallowDiffers } from './util';

/**
 * Memoize a component, so that it only updates when the props actually have
 * changed. This was previously known as `React.pure`.
 * @param {import('./internal').FunctionComponent} c functional component
 * @param {(prev: object, next: object) => boolean} [comparer] Custom equality function
 * @returns {import('./internal').FunctionComponent}
 */
export function memo(c, comparer) {
	function shouldUpdate(nextProps) {
		let ref = this.props.ref;
		if (ref != nextProps.ref && ref) {
			typeof ref == 'function' ? ref(null) : (ref.current = null);
		}

		return comparer
			? !comparer(this.props, nextProps) || ref != nextProps.ref
			: shallowDiffers(this.props, nextProps);
	}

	function Memoed(props) {
		this.shouldComponentUpdate = shouldUpdate;
		return createElement(c, props);
	}
	Memoed.displayName = 'Memo(' + (c.displayName || c.name) + ')';
	Memoed._forwarded = Memoed.prototype.isReactComponent = true;
	Memoed.type = c;
	return Memoed;
}
