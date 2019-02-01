export let i = 0;

/**
 *
 * @param {any} defaultValue
 */
export function createContext(defaultValue) {
	let id = '__cC' + i++;

	function Consumer(props, context) {
		let value = context[id] ? context[id].props.value : defaultValue;
		return props.children(value);
	}

	let ctx = { [id]: null };

	class Provider {
		getChildContext() {
			ctx[id] = this;
			return ctx;
		}

		render() {
			return this.props.children;
		}
	}

	return {
		_id: id,
		_defaultValue: defaultValue,
		Provider,
		Consumer
	};
}
