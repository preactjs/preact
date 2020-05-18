import { createElement, render, Component, Fragment } from 'preact';
// import renderToString from 'preact-render-to-string';
import './style.scss';
import { Router, Link } from 'preact-router';
import Pythagoras from './pythagoras';
import Spiral from './spiral';
import Reorder from './reorder';
import Todo from './todo';
import Fragments from './fragments';
import Context from './context';
import installLogger from './logger';
import ProfilerDemo from './profiler';
import KeyBug from './key_bug';
import StateOrderBug from './stateOrderBug';
import PeopleBrowser from './people';
import StyledComp from './styled-components';
import { initDevTools } from 'preact/devtools/src/devtools';
import { initDebug } from 'preact/debug/src/debug';
import DevtoolsDemo from './devtools';
import SuspenseDemo from './suspense';
import Redux from './redux';
import TextFields from './textFields';
import ReduxBug from './reduxUpdate';
import SuspenseRouterBug from './suspense-router';
import NestedSuspenseBug from './nested-suspense';
import { MobXDemo } from './mobx';

let isBenchmark = /(\/spiral|\/pythagoras|[#&]bench)/g.test(
	window.location.href
);
if (!isBenchmark) {
	// eslint-disable-next-line no-console
	console.log('Enabling devtools and debug');
	initDevTools();
	initDebug();
}

// mobx-state-tree fix
window.setImmediate = setTimeout;

class Home extends Component {
	render() {
		return (
			<div>
				<h1>Hello</h1>
			</div>
		);
	}
}

class DevtoolsWarning extends Component {
	onClick = () => {
		window.location.reload();
	};

	render() {
		return (
			<button onClick={this.onClick}>
				Start Benchmark (disables devtools)
			</button>
		);
	}
}

class App extends Component {
	render({ url }) {
		return (
			<div class="app">
				<header>
					<nav>
						<Link href="/" activeClassName="active">
							Home
						</Link>
						<Link href="/reorder" activeClassName="active">
							Reorder
						</Link>
						<Link href="/spiral" activeClassName="active">
							Spiral
						</Link>
						<Link href="/pythagoras" activeClassName="active">
							Pythagoras
						</Link>
						<Link href="/todo" activeClassName="active">
							ToDo
						</Link>
						<Link href="/fragments" activeClassName="active">
							Fragments
						</Link>
						<Link href="/key_bug" activeClassName="active">
							Key Bug
						</Link>
						<Link href="/profiler" activeClassName="active">
							Profiler
						</Link>
						<Link href="/context" activeClassName="active">
							Context
						</Link>
						<Link href="/devtools" activeClassName="active">
							Devtools
						</Link>
						<Link href="/empty-fragment" activeClassName="active">
							Empty Fragment
						</Link>
						<Link href="/people" activeClassName="active">
							People Browser
						</Link>
						<Link href="/state-order" activeClassName="active">
							State Order
						</Link>
						<Link href="/styled-components" activeClassName="active">
							Styled Components
						</Link>
						<Link href="/redux" activeClassName="active">
							Redux
						</Link>
						<Link href="/mobx" activeClassName="active">
							MobX
						</Link>
						<Link href="/suspense" activeClassName="active">
							Suspense / lazy
						</Link>
						<Link href="/textfields" activeClassName="active">
							Textfields
						</Link>
						<Link href="/reduxBug/1" activeClassName="active">
							Redux Bug
						</Link>
						<Link href="/suspense-router" activeClassName="active">
							Suspense Router Bug
						</Link>
						<Link href="/nested-suspense" activeClassName="active">
							Nested Suspense Bug
						</Link>
					</nav>
				</header>
				<main>
					<Router url={url}>
						<Home path="/" />
						<StateOrderBug path="/state-order" />
						<Reorder path="/reorder" />
						<div path="/spiral">
							{!isBenchmark ? <DevtoolsWarning /> : <Spiral />}
						</div>
						<div path="/pythagoras">
							{!isBenchmark ? <DevtoolsWarning /> : <Pythagoras />}
						</div>
						<Todo path="/todo" />
						<Fragments path="/fragments" />
						<ProfilerDemo path="/profiler" />
						<KeyBug path="/key_bug" />
						<Context path="/context" />
						<DevtoolsDemo path="/devtools" />
						<SuspenseDemo path="/suspense" />
						<EmptyFragment path="/empty-fragment" />
						<PeopleBrowser path="/people/:user?" />
						<StyledComp path="/styled-components" />
						<Redux path="/redux" />
						<MobXDemo path="/mobx" />
						<TextFields path="/textfields" />
						<ReduxBug path="/reduxBug/:start" />
						<SuspenseRouterBug path="/suspense-router" />
						<NestedSuspenseBug path="/nested-suspense" />
					</Router>
				</main>
			</div>
		);
	}
}

function EmptyFragment() {
	return <Fragment />;
}

// document.body.innerHTML = renderToString(<App url={location.href.match(/[#&]ssr/) ? undefined : '/'} />);
// document.body.firstChild.setAttribute('is-ssr', 'true');

installLogger(
	String(localStorage.LOG) === 'true' || location.href.match(/logger/),
	String(localStorage.CONSOLE) === 'true' || location.href.match(/console/)
);

render(<App />, document.body);
