import { createElement } from 'react';
import { Link } from './simple-router';

/** @jsx createElement */

export default function Hello() {
	return (
		<div>
			Hello! <Link to="/bye">Go to Bye!</Link>
		</div>
	);
}
