import { setupRerender, act } from 'preact/test-utils';
import {
	createElement,
	render,
	Component,
	createContext,
	Fragment
} from 'preact';
import { setupScratch, teardown } from '../_util/helpers';

/** @jsx createElement */

describe('createContext', () => {
	let scratch;
	let rerender;

	beforeEach(() => {
		scratch = setupScratch();
		rerender = setupRerender();
	});

	afterEach(() => {
		teardown(scratch);
	});

	it('should pass context to a consumer', () => {
		const { Provider, Consumer } = createContext();
		const CONTEXT = { a: 'a' };

		let receivedContext;

		class Inner extends Component {
			render(props) {
				return <div>{props.a}</div>;
			}
		}

		sinon.spy(Inner.prototype, 'render');

		render(
			<Provider value={CONTEXT}>
				<div>
					<Consumer>
						{data => {
							receivedContext = data;
							return <Inner {...data} />;
						}}
					</Consumer>
				</div>
			</Provider>,
			scratch
		);

		// initial render does not invoke anything but render():
		expect(Inner.prototype.render).to.have.been.calledWithMatch(CONTEXT);
		expect(receivedContext).to.equal(CONTEXT);
		expect(scratch.innerHTML).to.equal('<div><div>a</div></div>');
	});

	// This optimization helps
	// to prevent a Provider from rerendering the children, this means
	// we only propagate to children.
	// Strict equal vnode optimization
	it('skips referentially equal children to Provider', () => {
		const { Provider, Consumer } = createContext();
		let set,
			renders = 0;
		const Layout = ({ children }) => {
			renders++;
			return children;
		};
		class State extends Component {
			constructor(props) {
				super(props);
				this.state = { i: 0 };
				set = this.setState.bind(this);
			}
			render() {
				const { children } = this.props;
				return <Provider value={this.state}>{children}</Provider>;
			}
		}
		const App = () => (
			<State>
				<Layout>
					<Consumer>{({ i }) => <p>{i}</p>}</Consumer>
				</Layout>
			</State>
		);
		render(<App />, scratch);
		expect(renders).to.equal(1);
		set({ i: 2 });
		rerender();
		expect(renders).to.equal(1);
	});

	it('should preserve provider context through nesting providers', done => {
		const { Provider, Consumer } = createContext();
		const CONTEXT = { a: 'a' };
		const CHILD_CONTEXT = { b: 'b' };

		let parentContext, childContext;

		class Inner extends Component {
			render(props) {
				return (
					<div>
						{props.a} - {props.b}
					</div>
				);
			}
		}

		sinon.spy(Inner.prototype, 'render');

		render(
			<Provider value={CONTEXT}>
				<Consumer>
					{data => {
						parentContext = data;
						return (
							<Provider value={CHILD_CONTEXT}>
								<Consumer>
									{childData => {
										childContext = childData;
										return <Inner {...data} {...childData} />;
									}}
								</Consumer>
							</Provider>
						);
					}}
				</Consumer>
			</Provider>,
			scratch
		);

		// initial render does not invoke anything but render():
		expect(Inner.prototype.render).to.have.been.calledWithMatch({
			...CONTEXT,
			...CHILD_CONTEXT
		});
		expect(Inner.prototype.render).to.be.calledOnce;
		expect(parentContext).to.equal(CONTEXT);
		expect(childContext).to.equal(CHILD_CONTEXT);
		expect(scratch.innerHTML).to.equal('<div>a - b</div>');
		setTimeout(() => {
			expect(Inner.prototype.render).to.be.calledOnce;
			done();
		}, 0);
	});

	it('should preserve provider context between different providers', () => {
		const {
			Provider: ThemeProvider,
			Consumer: ThemeConsumer
		} = createContext();
		const { Provider: DataProvider, Consumer: DataConsumer } = createContext();
		const THEME_CONTEXT = { theme: 'black' };
		const DATA_CONTEXT = { global: 'a' };

		let receivedTheme;
		let receivedData;

		class Inner extends Component {
			render(props) {
				return (
					<div>
						{props.theme} - {props.global}
					</div>
				);
			}
		}

		sinon.spy(Inner.prototype, 'render');

		render(
			<ThemeProvider value={THEME_CONTEXT.theme}>
				<DataProvider value={DATA_CONTEXT}>
					<ThemeConsumer>
						{theme => {
							receivedTheme = theme;
							return (
								<DataConsumer>
									{data => {
										receivedData = data;
										return <Inner theme={theme} {...data} />;
									}}
								</DataConsumer>
							);
						}}
					</ThemeConsumer>
				</DataProvider>
			</ThemeProvider>,
			scratch
		);

		// initial render does not invoke anything but render():
		expect(Inner.prototype.render).to.have.been.calledWithMatch({
			...THEME_CONTEXT,
			...DATA_CONTEXT
		});
		expect(receivedTheme).to.equal(THEME_CONTEXT.theme);
		expect(receivedData).to.equal(DATA_CONTEXT);
		expect(scratch.innerHTML).to.equal('<div>black - a</div>');
	});

	it('should preserve provider context through nesting consumers', () => {
		const { Provider, Consumer } = createContext();
		const CONTEXT = { a: 'a' };

		let receivedData;
		let receivedChildData;

		class Inner extends Component {
			render(props) {
				return <div>{props.a}</div>;
			}
		}

		sinon.spy(Inner.prototype, 'render');

		render(
			<Provider value={CONTEXT}>
				<Consumer>
					{data => {
						receivedData = data;
						return (
							<Consumer>
								{childData => {
									receivedChildData = childData;
									return <Inner {...data} {...childData} />;
								}}
							</Consumer>
						);
					}}
				</Consumer>
			</Provider>,
			scratch
		);

		// initial render does not invoke anything but render():
		expect(Inner.prototype.render).to.have.been.calledWithMatch({ ...CONTEXT });
		expect(receivedData).to.equal(CONTEXT);
		expect(receivedChildData).to.equal(CONTEXT);
		expect(scratch.innerHTML).to.equal('<div>a</div>');
	});

	it('should not emit when value does not update', () => {
		const { Provider, Consumer } = createContext();
		const CONTEXT = { a: 'a' };

		class NoUpdate extends Component {
			shouldComponentUpdate() {
				return false;
			}

			render() {
				return this.props.children;
			}
		}

		class Inner extends Component {
			render(props) {
				return <div>{props.a}</div>;
			}
		}

		sinon.spy(Inner.prototype, 'render');

		render(
			<div>
				<Provider value={CONTEXT}>
					<NoUpdate>
						<Consumer>{data => <Inner {...data} />}</Consumer>
					</NoUpdate>
				</Provider>
			</div>,
			scratch
		);

		expect(Inner.prototype.render).to.have.been.calledOnce;

		render(
			<div>
				<Provider value={CONTEXT}>
					<NoUpdate>
						<Consumer>{data => <Inner {...data} />}</Consumer>
					</NoUpdate>
				</Provider>
			</div>,
			scratch
		);

		expect(Inner.prototype.render).to.have.been.calledOnce;
	});

	it('should preserve provider context through nested components', () => {
		const { Provider, Consumer } = createContext();
		const CONTEXT = { a: 'a' };

		let receivedContext;

		class Consumed extends Component {
			render(props) {
				return <strong>{props.a}</strong>;
			}
		}

		sinon.spy(Consumed.prototype, 'render');

		class Outer extends Component {
			render() {
				return (
					<div>
						<Inner />
					</div>
				);
			}
		}

		class Inner extends Component {
			render() {
				return (
					<Fragment>
						<InnerMost />
					</Fragment>
				);
			}
		}

		class InnerMost extends Component {
			render() {
				return (
					<div>
						<Consumer>
							{data => {
								receivedContext = data;
								return <Consumed {...data} />;
							}}
						</Consumer>
					</div>
				);
			}
		}

		render(
			<Provider value={CONTEXT}>
				<Outer />
			</Provider>,
			scratch
		);

		// initial render does not invoke anything but render():
		expect(Consumed.prototype.render).to.have.been.calledWithMatch({
			...CONTEXT
		});
		expect(receivedContext).to.equal(CONTEXT);
		expect(scratch.innerHTML).to.equal(
			'<div><div><strong>a</strong></div></div>'
		);
	});

	it('should propagates through shouldComponentUpdate false', done => {
		const { Provider, Consumer } = createContext();
		const CONTEXT = { a: 'a' };
		const UPDATED_CONTEXT = { a: 'b' };

		class Consumed extends Component {
			render(props) {
				return <strong>{props.a}</strong>;
			}
		}

		sinon.spy(Consumed.prototype, 'render');

		class Outer extends Component {
			render() {
				return (
					<div>
						<Inner />
					</div>
				);
			}
		}

		class Inner extends Component {
			shouldComponentUpdate() {
				return false;
			}

			render() {
				return (
					<Fragment>
						<InnerMost />
					</Fragment>
				);
			}
		}

		class InnerMost extends Component {
			render() {
				return (
					<div>
						<Consumer>{data => <Consumed {...data} />}</Consumer>
					</div>
				);
			}
		}

		class App extends Component {
			render() {
				return (
					<Provider value={this.props.value}>
						<Outer />
					</Provider>
				);
			}
		}

		render(<App value={CONTEXT} />, scratch);
		expect(scratch.innerHTML).to.equal(
			'<div><div><strong>a</strong></div></div>'
		);
		expect(Consumed.prototype.render).to.have.been.calledOnce;

		render(<App value={UPDATED_CONTEXT} />, scratch);

		rerender();

		// initial render does not invoke anything but render():
		expect(Consumed.prototype.render).to.have.been.calledTwice;
		// expect(Consumed.prototype.render).to.have.been.calledWithMatch({ ...UPDATED_CONTEXT }, {}, { ['__cC' + (ctxId - 1)]: {} });
		expect(scratch.innerHTML).to.equal(
			'<div><div><strong>b</strong></div></div>'
		);
		setTimeout(() => {
			expect(Consumed.prototype.render).to.have.been.calledTwice;
			done();
		});
	});

	it('should keep the right context at the right "depth"', () => {
		const { Provider, Consumer } = createContext();
		const CONTEXT = { theme: 'a', global: 1 };
		const NESTED_CONTEXT = { theme: 'b', global: 1 };

		let receivedData;
		let receivedNestedData;

		class Inner extends Component {
			render(props) {
				return (
					<div>
						{props.theme} - {props.global}
					</div>
				);
			}
		}
		class Nested extends Component {
			render(props) {
				return (
					<div>
						{props.theme} - {props.global}
					</div>
				);
			}
		}

		sinon.spy(Inner.prototype, 'render');
		sinon.spy(Nested.prototype, 'render');

		render(
			<Provider value={CONTEXT}>
				<Provider value={NESTED_CONTEXT}>
					<Consumer>
						{data => {
							receivedNestedData = data;
							return <Nested {...data} />;
						}}
					</Consumer>
				</Provider>
				<Consumer>
					{data => {
						receivedData = data;
						return <Inner {...data} />;
					}}
				</Consumer>
			</Provider>,
			scratch
		);

		// initial render does not invoke anything but render():
		expect(Nested.prototype.render).to.have.been.calledWithMatch({
			...NESTED_CONTEXT
		});
		expect(Inner.prototype.render).to.have.been.calledWithMatch({ ...CONTEXT });
		expect(receivedData).to.equal(CONTEXT);
		expect(receivedNestedData).to.equal(NESTED_CONTEXT);

		expect(scratch.innerHTML).to.equal('<div>b - 1</div><div>a - 1</div>');
	});

	it("should not re-render the consumer if the context doesn't change", () => {
		const { Provider, Consumer } = createContext();
		const CONTEXT = { i: 1 };

		class NoUpdate extends Component {
			shouldComponentUpdate() {
				return false;
			}

			render() {
				return this.props.children;
			}
		}

		class Inner extends Component {
			render(props) {
				return <div>{props.i}</div>;
			}
		}

		sinon.spy(Inner.prototype, 'render');

		render(
			<Provider value={CONTEXT}>
				<NoUpdate>
					<Consumer>{data => <Inner {...data} />}</Consumer>
				</NoUpdate>
			</Provider>,
			scratch
		);

		render(
			<Provider value={CONTEXT}>
				<NoUpdate>
					<Consumer>{data => <Inner {...data} />}</Consumer>
				</NoUpdate>
			</Provider>,
			scratch
		);

		// Rendered twice, should called just one 'Consumer' render
		expect(Inner.prototype.render).to.have.been.calledOnce.and.calledWithMatch(
			CONTEXT
		);
		expect(scratch.innerHTML).to.equal('<div>1</div>');

		act(() => {
			render(
				<Provider value={{ i: 2 }}>
					<NoUpdate>
						<Consumer>{data => <Inner {...data} />}</Consumer>
					</NoUpdate>
				</Provider>,
				scratch
			);
		});

		// Rendered three times, should call 'Consumer' render two times
		expect(
			Inner.prototype.render
		).to.have.been.calledTwice.and.calledWithMatch({ i: 2 });
		expect(scratch.innerHTML).to.equal('<div>2</div>');
	});

	it('should allow for updates of props', () => {
		let app;
		const { Provider, Consumer } = createContext();
		class App extends Component {
			constructor(props) {
				super(props);
				this.state = {
					status: 'initial'
				};

				this.renderInner = this.renderInner.bind(this);

				app = this;
			}

			renderInner(value) {
				return (
					<p>
						{value}: {this.state.status}
					</p>
				);
			}

			render() {
				return (
					<Provider value="value">
						<Consumer>{this.renderInner}</Consumer>
					</Provider>
				);
			}
		}

		act(() => {
			render(<App />, scratch);
		});

		expect(scratch.innerHTML).to.equal('<p>value: initial</p>');

		act(() => {
			app.setState({ status: 'updated' });
			rerender();
		});

		expect(scratch.innerHTML).to.equal('<p>value: updated</p>');
	});

	it('should re-render the consumer if the children change', () => {
		const { Provider, Consumer } = createContext();
		const CONTEXT = { i: 1 };

		class Inner extends Component {
			render(props) {
				return <div>{props.i}</div>;
			}
		}

		sinon.spy(Inner.prototype, 'render');

		act(() => {
			render(
				<Provider value={CONTEXT}>
					<Consumer>{data => <Inner {...data} />}</Consumer>
				</Provider>,
				scratch
			);

			// Not calling re-render since it's gonna get called with the same Consumer function
			render(
				<Provider value={CONTEXT}>
					<Consumer>{data => <Inner {...data} />}</Consumer>
				</Provider>,
				scratch
			);
		});

		// Rendered twice, with two different children for consumer, should render twice
		expect(Inner.prototype.render).to.have.been.calledTwice;
		expect(scratch.innerHTML).to.equal('<div>1</div>');
	});

	it('should not rerender consumers that have been unmounted', () => {
		const { Provider, Consumer } = createContext(0);

		const Inner = sinon.spy(props => <div>{props.value}</div>);

		let toggleConsumer;
		let changeValue;
		class App extends Component {
			constructor() {
				super();

				this.state = { value: 0, show: true };
				changeValue = value => this.setState({ value });
				toggleConsumer = () => this.setState(({ show }) => ({ show: !show }));
			}
			render(props, state) {
				return (
					<Provider value={state.value}>
						<div>
							{state.show ? (
								<Consumer>{data => <Inner value={data} />}</Consumer>
							) : null}
						</div>
					</Provider>
				);
			}
		}

		render(<App />, scratch);
		expect(scratch.innerHTML).to.equal('<div><div>0</div></div>');
		expect(Inner).to.have.been.calledOnce;

		changeValue(1);
		rerender();
		expect(scratch.innerHTML).to.equal('<div><div>1</div></div>');
		expect(Inner).to.have.been.calledTwice;

		toggleConsumer();
		rerender();
		expect(scratch.innerHTML).to.equal('<div></div>');
		expect(Inner).to.have.been.calledTwice;

		changeValue(2);
		rerender();
		expect(scratch.innerHTML).to.equal('<div></div>');
		expect(Inner).to.have.been.calledTwice;
	});

	describe('class.contextType', () => {
		it('should use default value', () => {
			const ctx = createContext('foo');

			let actual;
			class App extends Component {
				render() {
					actual = this.context;
					return <div>bar</div>;
				}
			}

			App.contextType = ctx;

			render(<App />, scratch);
			expect(actual).to.deep.equal('foo');
		});

		it('should use the value of the nearest Provider', () => {
			const ctx = createContext('foo');

			let actual;
			class App extends Component {
				render() {
					actual = this.context;
					return <div>bar</div>;
				}
			}

			App.contextType = ctx;
			const Provider = ctx.Provider;

			render(
				<Provider value="bar">
					<Provider value="bob">
						<App />
					</Provider>
				</Provider>,
				scratch
			);
			expect(actual).to.deep.equal('bob');
		});

		it('should restore legacy context for children', () => {
			const Foo = createContext('foo');
			const spy = sinon.spy();

			class NewContext extends Component {
				render() {
					return <div>{this.props.children}</div>;
				}
			}

			class OldContext extends Component {
				getChildContext() {
					return { foo: 'foo' };
				}

				render() {
					return <div>{this.props.children}</div>;
				}
			}

			class Inner extends Component {
				render() {
					spy(this.context);
					return <div>Inner</div>;
				}
			}

			NewContext.contextType = Foo;

			render(
				<Foo.Provider value="bar">
					<OldContext>
						<NewContext>
							<Inner />
						</NewContext>
					</OldContext>
				</Foo.Provider>,
				scratch
			);

			expect(spy).to.be.calledWithMatch({ foo: 'foo' });
		});

		it('should call componentWillUnmount', () => {
			let Foo = createContext('foo');
			let spy = sinon.spy();

			let instance;
			class App extends Component {
				constructor(props) {
					super(props);
					instance = this;
				}

				componentWillUnmount() {
					spy(this);
				}

				render() {
					return <div />;
				}
			}

			App.contextType = Foo;

			render(
				<Foo.Provider value="foo">
					<App />
				</Foo.Provider>,
				scratch
			);

			render(null, scratch);

			expect(spy).to.be.calledOnce;
			expect(spy.getCall(0).args[0]).to.equal(instance);
		});

		it('should order updates correctly', () => {
			const events = [];
			let update;
			const Store = createContext();

			class Root extends Component {
				constructor(props) {
					super(props);
					this.state = { id: 0 };
					update = this.updateStore = this.updateStore.bind(this);
				}

				updateStore() {
					this.setState(state => ({ id: state.id + 1 }));
				}

				render() {
					return (
						<Store.Provider value={this.state.id}>
							<App />
						</Store.Provider>
					);
				}
			}

			class App extends Component {
				shouldComponentUpdate() {
					return false;
				}

				render() {
					return <Store.Consumer>{id => <Parent key={id} />}</Store.Consumer>;
				}
			}

			function Parent(props) {
				return <Store.Consumer>{id => <Child id={id} />}</Store.Consumer>;
			}

			class Child extends Component {
				componentDidMount() {
					events.push('mount ' + this.props.id);
				}

				componentDidUpdate(prevProps) {
					events.push('update ' + prevProps.id + ' to ' + this.props.id);
				}

				componentWillUnmount() {
					events.push('unmount ' + this.props.id);
				}

				render() {
					events.push('render ' + this.props.id);
					return this.props.id;
				}
			}

			render(<Root />, scratch);
			expect(events).to.deep.equal(['render 0', 'mount 0']);

			update();
			rerender();
			expect(events).to.deep.equal([
				'render 0',
				'mount 0',
				'render 1',
				'unmount 0',
				'mount 1'
			]);
		});
	});

	it('should rerender when reset to defaultValue', () => {
		const defaultValue = { state: 'hi' };
		const context = createContext(defaultValue);
		let set;

		class NoUpdate extends Component {
			shouldComponentUpdate() {
				return false;
			}

			render() {
				return <context.Consumer>{v => <p>{v.state}</p>}</context.Consumer>;
			}
		}

		class Provider extends Component {
			constructor(props) {
				super(props);
				this.state = defaultValue;
				set = this.setState.bind(this);
			}

			render() {
				return (
					<context.Provider value={this.state}>
						<NoUpdate />
					</context.Provider>
				);
			}
		}

		render(<Provider />, scratch);
		expect(scratch.innerHTML).to.equal('<p>hi</p>');

		set({ state: 'bye' });
		rerender();
		expect(scratch.innerHTML).to.equal('<p>bye</p>');

		set(defaultValue);
		rerender();
		expect(scratch.innerHTML).to.equal('<p>hi</p>');
	});
});
