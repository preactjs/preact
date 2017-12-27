import { Component } from "./component";
import { extendComponent } from "./util";

/**
 *
 * @param {string} key
 */
export function createContext(key) {
	/** Provider Component class.
	 *	prop `value` is provided to every corresponding `Consumer` component.
	 *	@public
	 *
	 */
	function Provider(props, context) {
		Component.call(this, props, context);

		this.c = [];
	}

	extendComponent(Provider.prototype, {
		s(subscriber) {
			this.c.push(subscriber);
			subscriber(this.props.value);
		},

		getChildContext() {
			return { [key]: this.s };
		},

		componentWillReceiveProps(nextProps) {
			if (!Object.is(this.props.value, nextProps.value)) {
				this.c.forEach(subscriber => {
					subscriber(nextProps.value);
				});
			}
		},

		render() {
			return this.props.children;
		}
	});

  /**  Consumer Component class.
	 *	`children` must be a function that accepts the value from the `Consumer`'s
	 		corresponding `Provider` component.
	 *	@public
	 *
	 */
	function Consumer(props, context) {
		Component.call(this, props, context);

		context[key](value => {
			this.setState({ value });
		});
	}

	extendComponent(Consumer.prototype, {
		render() {
			return this.props.children(this.state.value);
		}
	});

	return { Provider, Consumer };
}
