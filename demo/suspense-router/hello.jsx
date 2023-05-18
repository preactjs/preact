import { Link } from './simple-router';

export default function Hello() {
	return (
		<div>
			Hello! <Link to="/bye">Go to Bye!</Link>
		</div>
	);
}
