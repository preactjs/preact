import { Component } from './component';

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
	Consumer.prototype = new Component();
	Consumer.prototype.componentDidMount = function() {
		if (id in this.context) this.context[id]._subscribers.push(this);
	};
	Component.prototype.componentWillUnmount = function() {
		let ctx = this.context;
		if (id in ctx) {
			let s = ctx[id]._subscribers;
			s.splice(s.indexOf(this), 1);
		}
	};
	Consumer.prototype.render = function(props, state) {
		return props.children(state.value);
	};

	let ctx = { [id]: null };

	function Provider() {
		Component.call(this);
	}
	Provider.prototype._subscribers = [];
	Provider.prototype.getChildContext = function() {
		ctx[id] = this;
		return ctx;
	};
	Provider.prototype.componentDidUpdate = function() {
		let v = this.props.value;
		this._subscribers.forEach(c => v!==c.state.value && c.setState({ value: v }));
	};
	Provider.prototype.render = function(props) {
		return props.children;
	};

	return {
		_id: id,
		_defaultValue: defaultValue,
		Provider,
		Consumer
	};
}
