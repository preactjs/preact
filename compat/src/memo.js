import { shallowDiffers } from './util';

/**
 * Memoize a component, so that it only updates when the props actually have
 * changed. This was previously known as `React.pure`.
 * @param {import('./internal').FunctionComponent} c functional component
 * @param {(prev: object, next: object) => boolean} [comparer] Custom equality function
 * @returns {import('./internal').FunctionComponent}
 */
export function memo(c, comparer) {
	const instances = new WeakSet();

	function shouldUpdate(nextProps) {
		const ref = this.props.ref;
		if (ref != nextProps.ref && ref) {
			typeof ref == 'function' ? ref(null) : (ref.current = null);
		}

		return comparer
			? !comparer(this.props, nextProps) || ref != nextProps.ref
			: shallowDiffers(this.props, nextProps);
	}

	function Memoed(props, context) {
		if (!instances.has(this)) {
			instances.add(this);
			const shouldComponentUpdate = this.shouldComponentUpdate;
			this.shouldComponentUpdate = shouldComponentUpdate
				? function (nextProps, nextState, nextContext) {
						return (
							shouldComponentUpdate.call(
								this,
								nextProps,
								nextState,
								nextContext
							) && shouldUpdate.call(this, nextProps)
						);
					}
				: shouldUpdate;
		}

		return c.call(this, props, context);
	}
	Memoed.displayName = 'Memo(' + (c.displayName || c.name) + ')';
	Memoed.prototype.isReactComponent = true;
	Memoed.type = c;
	return Memoed;
}
