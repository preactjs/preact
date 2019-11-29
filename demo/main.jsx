import { Component, Fragment, createContext, render, h } from '../src';
const Preview = () => null; // or false

class App extends Component {
	state = {
		output: null
	};

	run() {
		this.setState({
			output: ['A', 'B', 'C']
		});
	}

	render() {
		return (
			<div>
				<button onClick={() => this.run()}>Run</button>
				<Fragment>
					{this.state.output && this.state.output.map(v => v)}
				</Fragment>
			</div>
		);
	}
}
render(<App />, document.getElementById('app'));
