import { Component, createContext, render, h } from '../src';
var i = 0;
class Root extends Component {
	state = {
		arr: [1, 2]
	};

	render() {
		return this.state.arr.map(item => {
			return item;
		});
	}
}

render(
	<div id={'1'}>
		<Root />
	</div>,
	document.getElementById('app')
);
