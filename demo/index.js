import { createElement, render, hydrate, Component } from 'ceviche';
import './style.scss';
import { Router } from 'preact-router';
import { Link } from 'preact-router/match';
import Pythagoras from './pythagoras';
import Spiral from './spiral';
import Reorder from './reorder';
import Todo from './todo';
import Fragments from './fragments';
import installLogger from './logger';

window.ceviche = { createElement, render, hydrate, Component };

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
	render() {
		return (
			<div class="app">
				<header>
					<nav>
						<Link href="/" activeClassName="active">Home</Link>
						<Link href="/reorder" activeClassName="active">Reorder</Link>
						<Link href="/spiral" activeClassName="active">Spiral</Link>
						<Link href="/pythagoras" activeClassName="active">Pythagoras</Link>
						<Link href="/todo" activeClassName="active">ToDo</Link>
						<Link href="/fragments" activeClassName="active">Fragments</Link>
					</nav>
				</header>
				<main>
					<Router>
						<Home path="/" />
						<Reorder path="/reorder" />
						<Spiral path="/spiral" />
						<Pythagoras path="/pythagoras" />
						<Todo path="/todo" />
						<Fragments path="/fragments" />
					</Router>
				</main>
			</div>
		);
	}
}
//
//
// document.body.innerHTML = `
// <div class="app">
// 	<header>
// 		<nav>
// 			<a href="/">Home SSR</a>
// 			<a href="/reorder">Reorder</a>
// 			<a href="/spiral">Spiral SSR</a>
// 			<a href="/pythagoras">Pythagoras SSR</a>
// 			<a href="/todo">ToDo</a>
// 			<a href="/fragments">Fragments</a>
// 		</nav>
// 	</header>
// 	<main>
// 		<h1>SSR Content</h1>
// 	</main>
// </div>
// `;

// skip hydrate with fragments
document.body._previousVTree = (
  <div></div>
)

render(<App />, document.body);

if (String(localStorage.LOG)==='true' || location.href.match(/logger/)) {
	installLogger();
}
