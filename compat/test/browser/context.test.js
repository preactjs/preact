import { setupRerender } from 'preact/test-utils';
import { setupScratch, teardown } from '../../../test/_util/helpers';
import React, {
	render,
	createElement,
	createContext,
	Component,
	useState,
	useContext
} from 'preact/compat';

describe('components', () => {
	/** @type {HTMLDivElement} */
	let scratch;

	/** @type {() => void} */
	let rerender;

	beforeEach(() => {
		scratch = setupScratch();
		rerender = setupRerender();
	});

	afterEach(() => {
		teardown(scratch);
	});

	it('nested context updates propagate throughout the tree synchronously', () => {
		const RouterContext = createContext({ location: '__default_value__' });

		const route1 = '/page/1';
		const route2 = '/page/2';

		/** @type {() => void} */
		let toggleLocalState;
		/** @type {() => void} */
		let toggleLocation;

		/** @type {Array<{location: string, localState: boolean}>} */
		let pageRenders = [];

		function runUpdate() {
			toggleLocalState();
			toggleLocation();
		}

		/**
		 * @extends {React.Component<{children: any}, {location: string}>}
		 */
		class Router extends Component {
			constructor(props) {
				super(props);
				this.state = { location: route1 };
				toggleLocation = () => {
					const oldLocation = this.state.location;
					const newLocation = oldLocation === route1 ? route2 : route1;
					// console.log('Toggling  location', oldLocation, '->', newLocation);
					this.setState({ location: newLocation });
				};
			}

			render() {
				// console.log('Rendering Router', { location: this.state.location });
				return (
					<RouterContext.Provider value={{ location: this.state.location }}>
						{this.props.children}
					</RouterContext.Provider>
				);
			}
		}

		/**
		 * @extends {React.Component<{children: any}>}
		 */
		class Route extends Component {
			render() {
				return (
					<RouterContext.Consumer>
						{contextValue => {
							// console.log('Rendering Route', {
							// 	location: contextValue.location
							// });
							// Pretend to do something with the context value
							const newContextValue = { ...contextValue };
							return (
								<RouterContext.Provider value={newContextValue}>
									{this.props.children}
								</RouterContext.Provider>
							);
						}}
					</RouterContext.Consumer>
				);
			}
		}

		function Page() {
			const [localState, setLocalState] = useState(true);
			const { location } = useContext(RouterContext);

			pageRenders.push({ location, localState });
			// console.log('Rendering Page', { location, localState });

			toggleLocalState = () => {
				let newValue = !localState;
				// console.log('Toggling  localState', localState, '->', newValue);
				setLocalState(newValue);
			};

			return (
				<>
					<div>localState: {localState.toString()}</div>
					<div>location: {location}</div>
					<div>
						<button type="button" onClick={runUpdate}>
							Trigger update
						</button>
					</div>
				</>
			);
		}

		function App() {
			return (
				<Router>
					<Route>
						<Page />
					</Route>
				</Router>
			);
		}

		render(<App />, scratch);
		expect(pageRenders).to.deep.equal([{ location: route1, localState: true }]);

		pageRenders = [];
		runUpdate(); // Simulate button click
		rerender();

		// Page should rerender once with both propagated context and local state updates
		expect(pageRenders).to.deep.equal([
			{ location: route2, localState: false }
		]);
	});
});
