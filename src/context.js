import { extend } from "./util";
import { Component } from "./component";

function ContextProvider(value) {
	this.value = value;
	this.updaters = [];
}

extend(ContextProvider.prototype, {
	setValue(value) {
		if (value === this.value) {
			return;
		}
		this.value = value;
		this.updaters.forEach(up => up(value));
	},
	register(updater) {
		this.updaters.push(updater);
		updater(this.value);

		return () => (this.updaters = this.updaters.filter(i => i !== updater));
	}
});

export function createContext(value) {
	const contextProvider = new ContextProvider(value);

	function Provider(props, ctx) {
		Component.call(this, props, ctx);
		contextProvider.setValue(props.value);
	}

	extend(Provider.prototype, Component.prototype);
	extend(Provider.prototype, {
		componentWillReceiveProps(next) {
			contextProvider.setValue(next.value);
		},
		render() {
			const children = this.props.children;
			return children && children[0];
		}
	});

	function Consumer(props, ctx) {
		Component.call(this, props, ctx);
		this._un = contextProvider.register(val =>
			this.setState({
				value: val
			})
		);
	}

	extend(Consumer.prototype, Component.prototype);
	extend(Consumer.prototype, {
		componentWillUnmount() {
			this._un && this._un();
		},
		render() {
			const child = this.props.children[0];
			if (typeof child === "function") {
				return child(this.state.value || value);
			}
			// do we really need to check if the given child
			// is a function or not?
			return child;
		}
	});

	return {
		Provider: Provider,
		Consumer: Consumer
	};
}
