import { createElement } from 'react';
import { Link } from './simple-router';

/** @jsx createElement */

export default function Bye() {
	return (
		<div>
			Bye! <Link to="/">Go to Hello!</Link>
		</div>
	);
}
