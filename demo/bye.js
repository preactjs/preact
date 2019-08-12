import { createElement, Component } from 'react';
import { Link } from 'react-router-dom';

export default class Bye extends Component {
	render() {
		return (
			<div>
        Bye! <Link to="/">Go to Hello!</Link>
			</div>
		);
	}
}
