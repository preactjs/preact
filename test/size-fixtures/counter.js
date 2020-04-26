import { createElement, Component, render } from '../../';

/* @jsx createElement */

class App extends Component {
	constructor() {
		super();
		this.state = { value: 0 };
	}

	render(props, state) {
		return (
			<button
				class="btn badge"
				data-badge={state.value}
				style="margin-top: .5rem"
				onClick={() => this.setState({ value: state.value + 1 })}
			>
				count: {state.value}
			</button>
		);
	}
}

render(<App />, document.getElementById('app'));
