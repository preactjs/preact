import { Component, h, render } from '../src';

/**
 * react中应该是这样
 * import React,{Component} from 'react'
 * import {render} from 'react-dom'
 */

class App extends Component {
	render() {
		return (
			<div id="wrap">
				<span>123</span>
				456
			</div>
		);
	}
}

render(<App />, document.getElementById('app'));

console.log(<App />);
