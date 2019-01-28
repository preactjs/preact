export let i = 0;

/**
 *
 * @param {any} defaultValue
 */
export function createContext(defaultValue) {
	let id = i++;

	function Consumer(props, context) {
		let value = context[id] ? context[id].props.value : defaultValue;
		return props.children(value);
	}

	class Provider {
		getChildContext() {
			return { [id]: this };
		}

		render() {
			return this.props.children;
		}
	}

	return {
		Provider,
		Consumer
	};
}
