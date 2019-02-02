import { Component } from './component';
import { assign } from './util';

export let i = 0;

/**
 *
 * @param {any} defaultValue
 */
export function createContext(defaultValue) {
	let id = '__cC' + i++;

	function Consumer(props, context) {
		let value = id in context ? context[id].props.value : defaultValue;
		this.state = { value };
	}
	assign(Consumer.prototype = new Component(), {
		componentDidMount() {
			if (id in this.context) this.context[id]._subscribers.push(this);
		},
		componentWillUnmount() {
			let ctx = this.context;
			if (id in ctx) {
				let s = ctx[id]._subscribers;
				s.splice(s.indexOf(this), 1);
			}
		},
		render(props, state) {
			return props.children(state.value);
		}
	});

	let ctx = { [id]: null };

	function Provider() {}
	assign(Provider.prototype, {
		_subscribers: [],
		getChildContext() {
			ctx[id] = this;
			return ctx;
		},
		componentDidUpdate() {
			let v = this.props.value;
			this._subscribers.forEach(c => v!==c.state.value && c.setState({ value: v }));
		},
		render(props) {
			return props.children;
		}
	});

	return {
		_id: id,
		_defaultValue: defaultValue,
		Provider,
		Consumer
	};
}
