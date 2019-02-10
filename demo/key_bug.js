import { createElement, Component } from 'preact';

function Foo(props) {
	return <div>This is: {props.children}</div>;
}

export default class KeyBug extends Component {
	constructor() {
		super();
		this.onClick = this.onClick.bind(this);
		this.state = { active: false };
	}

	onClick() {
		this.setState(prev => ({ active: !prev.active }));
	}

	render() {
		return (
			<div>
				{this.state.active && <Foo>foo</Foo>}
				<h1>Hello World</h1>
				<br />
				<Foo>
					bar <Foo>bar</Foo>
				</Foo>
				<br />
				<button onClick={this.onClick}>Toggle</button>
			</div>
		);
	}
}
