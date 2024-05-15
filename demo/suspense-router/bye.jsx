import { Link } from './simple-router';

export default function Bye() {
	return (
		<div>
			Bye! <Link to="/">Go to Hello!</Link>
		</div>
	);
}
