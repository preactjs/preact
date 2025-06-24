import { createElement, Component } from '../../';

// declare global JSX types that should not be mixed with preact's internal types
declare global {
	namespace JSX {
		interface Element {
			unknownProperty: string;
		}
	}
}

class SimpleComponent extends Component {
	render() {
		return <div>It works</div>;
	}
}
