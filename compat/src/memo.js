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
		if (this._el._component._force) return true;

		let updateRef = ref == nextProps.ref;
		if (!updateRef && ref) {
			ref.call ? ref(null) : (ref.current = null);
		}

		if (!comparer) {
			return shallowDiffers(this.props, nextProps);
		}

		return !comparer(this.props, nextProps) || !updateRef;
	}

	function Memoed(props) {
		this.shouldComponentUpdate = shouldUpdate;
		const element = createElement(c, props);
		this._el = element;
		return element;
	}
	Memoed.displayName = 'Memo(' + (c.displayName || c.name) + ')';
	Memoed.prototype.isReactComponent = true;
	Memoed._forwarded = true;
	return Memoed;
}
