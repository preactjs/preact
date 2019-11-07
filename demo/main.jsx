import { Component, createContext, render, h } from '../src';

class Root extends Component {
	state = {
		arr: [1, 2, 3]
	};

	render() {
		return <div onClick={() => {}}>{this.state.arr}</div>;
	}
}

render(<Root />, document.getElementById('app'));
