import { createElement, Component } from 'preact';
import { connect, Provider } from 'react-redux';
import { createStore } from 'redux';
import { HashRouter, Route, Link } from 'react-router-dom';

const store = createStore(
	(state, action) => ({ ...state, display: action.display }),
	{ display: false }
);

function _Redux({ showMe, counter }) {
	if (!showMe) return null;
	return <div>showMe {counter}</div>;
}
const Redux = connect(
	state => console.log('injecting', state.display) || { showMe: state.display }
)(_Redux);

let display = false;
class Test extends Component {
	componentDidUpdate(prevProps) {
		if (this.props.start != prevProps.start) {
			this.setState({ f: (this.props.start || 0) + 1 });
			setTimeout(() => this.setState({ i: (this.state.i || 0) + 1 }));
		}
	}

	render() {
		const { f } = this.state;
		return (
			<div>
				<button
					onClick={() => {
						display = !display;
						store.dispatch({ type: 1, display });
					}}
				>
					Toggle visibility
				</button>
				<Link to={`/${(parseInt(this.props.start) || 0) + 1}`}>Click me</Link>

				<Redux counter={f} />
			</div>
		);
	}
}

function App() {
	return (
		<Provider store={store}>
			<HashRouter>
				<Route
					path="/:start?"
					render={({ match }) => <Test start={match.params.start || 0} />}
				/>
			</HashRouter>
		</Provider>
	);
}

export default App;
