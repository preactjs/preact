// eslint-disable-next-line no-unused-vars
import { createElement, Component, memo, Fragment } from "react";

function Foo() {
	return <div>I'm memoed</div>;
}

class Foo2 extends Component {
	render() {
		return <div>I'm memoed, too</div>;
	}
}

const Memoed = memo(Foo);
const Memoed2 = memo(Foo2);

export default class DevtoolsDemo extends Component {
	render() {
		return (
			<div>
				<h1>memo()</h1>
				<p><b>functional component:</b></p>
				<Memoed />
				<br />
				<p><b>class component:</b></p>
				<Memoed2 />
			</div>
		);
	}
}
