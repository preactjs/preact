import { Component } from './component';
import { createElement } from './create-element';

// TODO: react warns in dev mode about defaultProps and propTypes not being supported on lazy
// loaded components

export const sym = Symbol.for('Suspense');

export class Suspense extends Component {
	constructor(props) {
		// TODO: should we add propTypes in DEV mode?
		super(props);

		// mark this component as a handler of suspension (thrown Promises)
		this[sym] = sym;

		this.state = {
			l: false
		};
	}

	componentDidCatch(e) {
		if (e && typeof e.then === 'function') {
			this.setState({ l: true });
			e.then(
				() => {
					this.setState({ l: false });
				},
				// Suspense ignores errors thrown in Promises as this should be handled by user land code
				() => {
					this.setState({ l: false });
				}
			);
		}
		else {
			throw e;
		}
	}

	render() {
		return this.state.l ? this.props.fallback : this.props.children;
	}
}

export function lazy(loader) {
	let prom;
	let component;
	let error;
	return function Lazy(props) {
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
