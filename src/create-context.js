export let i = 0;

/**
 *
 * @param {any} defaultValue
 */
export function createContext(defaultValue) {
	const id = '__cC' + i++;

	function Consumer(props, context) {
		let value = id in context ? context[id] : defaultValue;
		return props.children(value);
	}

	let ctx = { [id]: null };

	class Provider {
		getChildContext() {
			ctx[id] = this.props.value;
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
