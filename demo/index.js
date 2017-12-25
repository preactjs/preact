import { createElement, render, hydrate, Component } from 'ceviche';
import './style.scss';
import { Router, Link } from 'preact-router';
import Pythagoras from './pythagoras';
import Spiral from './spiral';
import Reorder from './reorder';
import installLogger from './logger';

window.ceviche = { createElement, render, hydrate, Component };

// render(
// 	<Pythagoras />,
// 	document.body
// );

class Home extends Component {
	a = 1;
	render() {
		return (
			<div>
				<h1>Hello</h1>
			</div>
		);
	}
}

class App extends Component {
	a = window.app = this;

	render() {
		return (
			<div>
				<header>
					<nav>
						<Link href="/">Home</Link>
						<Link href="/reorder">Reorder</Link>
						<Link href="/spiral">Spiral</Link>
						<Link href="/pythagoras">Pythagoras</Link>
					</nav>
				</header>
				<Router>
					<Home path="/" />
					<Reorder path="/reorder" />
					<Spiral path="/spiral" />
					<Pythagoras path="/pythagoras" />
				</Router>
			</div>
		);
	}
}


document.body.innerHTML = `
<div>
	<header>
		<nav>
			<a href="/">Home SSR</a>
			<a href="/spiral">Spiral SSR</a>
			<a href="/pythagoras">Pythagoras SSR</a>
		</nav>
	</header>
	<div>
		<h1>SSR Content</h1>
	</div>
</div>
`;

hydrate(<App />, document.body);


if (localStorage.LOG==='true' || location.href.match(/logger/)) {
	installLogger();
}
