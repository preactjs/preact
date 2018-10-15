import { createElement, Fragment } from './index';
/**
 *
 * @param {any} defaultValue
 */
export function createContext(defaultValue = {}) {
	function Consumer(props) {
		return props.children(props.value);
	}

	Consumer.defaultValue = defaultValue;
	Consumer.Provider = function Provider(props) {
		return props.children;
	};
	Consumer.Provider.context = true;

	return {
		Provider: Consumer.Provider,
		Consumer
	};
}
