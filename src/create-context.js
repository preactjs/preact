/**
 *
 * @param {any} defaultValue
 */
export function createContext(defaultValue) {
	function Consumer(props) {
		return props.children(props.value);
	}
	function Provider(props) {
		return props.children;
	}

	Consumer._defaultValue = defaultValue;
	Consumer._provider = Provider;
	Provider._context = Consumer;

	return {
		Provider,
		Consumer
	};
}
