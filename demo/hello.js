import { createElement, Component } from 'react';
import { Link } from 'react-router-dom';

export default class Hello extends Component {
	render() {
		return (
			<div>
        Hello! <Link to="/bye">Go to Bye!</Link>
			</div>
		);
	}
}
