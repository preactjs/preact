import { Component } from './component';
import { createElement } from './create-element';

export class Suspense extends Component {
	constructor(props) {
		super(props);

		this.state = {};
	}

	__s(e) {
		if (typeof e.then == 'function') {
			this.setState({ l: 1 });
			const cb = () => { this.setState({ l: 0 }); };

			// Suspense ignores errors thrown in Promises as this should be handled by user land code
			e.then(cb, cb);
		}
		else {
			throw e;
		}
	}

	render(props, state) {
		return state.l ? props.fallback : props.children;
	}
}

export function lazy(loader) {
	let prom;
	let component;
	let error;
	return function L(props) {
		if (!prom) {
			prom = loader();
			prom.then(
				({ default: c }) => { component = c; },
				e => error = e,
			);
		}

		if (error) {
			throw error;
		}

		if (!component) {
			throw prom;
		}

		return createElement(component, props);
	};
}