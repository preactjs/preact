import { Component } from './component';
import { createElement } from './create-element';

// TODO: react warns in dev mode about defaultProps and propTypes not being supported on lazy
// loaded components

export class Suspense extends Component {
	constructor(props) {
		// TODO: should we add propTypes in DEV mode?
		super(props);

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
				// TODO: what to do in error case?!
				// we could store the error to the state and then throw it during render
				// should have a look what react does in these cases...
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
