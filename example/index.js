import { h, render, Component } from '../src/preact';

class Clock extends Component {
	render() {
		return (
			<div id="foo">
				<span>Hello, world!</span>
				<button onClick={ e => alert("hi Preact!") }>Click Me</button>
			</div>
		);
	}
}

render(<Clock />, document.getElementById('root'));
