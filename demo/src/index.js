import "preact/debug";
import { createElement, render, Component } from 'preact';

class Bar extends Component {
	constructor(props) {
		super(props);
		this.state = { foo: 123 }
	}
	render() {
		return <div>bar {this.state.foo}</div>
	}
}

function Bob() {
	return <Baz />;
}

function Baz() {
	return <div>blah</div>;
}

function App() {
	return <div>Hello World <Bar/> <Bob /></div>;
}

render(<App><Bar /></App>, document.body);
