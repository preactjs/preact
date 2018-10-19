/**
 *
 * @param {any} defaultValue
 */
export function createContext(defaultValue = {}) {
	function Consumer(props) {
		return props.children(props.value);
	}
	function Provider(props) {
		return props.children;
	}

	Consumer.defaultValue = defaultValue;
	Consumer.Provider = Provider;
	Consumer.Provider.context = Consumer;

	return {
		Provider: Consumer.Provider,
		Consumer
	};
}
