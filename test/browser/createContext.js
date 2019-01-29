import { createElement as h, render, Component, createContext } from '../../src/index';
import { setupScratch, teardown } from '../_util/helpers';
import { Fragment } from '../../src';
import { i as ctxId } from '../../src/create-context';

/** @jsx h */

describe('createContext', () => {
	let scratch;

	beforeEach(() => {
		scratch = setupScratch();
	});

	afterEach(() => {
		teardown(scratch);
	});

	it('should pass context to a consumer', () => {
		const { Provider, Consumer } = createContext();
		const CONTEXT = { a: 'a' };

		class Inner extends Component {
			render(props) {
				return <div>{props.a}</div>;
			}
		}

		sinon.spy(Inner.prototype, 'render');

		render(<Provider value={CONTEXT}>
			<div>
				<Consumer>
					{data => <Inner {...data} />}
				</Consumer>
			</div>
		</Provider>, scratch);

		// initial render does not invoke anything but render():
		expect(Inner.prototype.render).to.have.been.calledWithMatch(CONTEXT, {},  { ['__cC' + (ctxId - 1)]: {} });
		expect(scratch.innerHTML).to.equal('<div><div>a</div></div>');
	});

	it('should preserve provider context through nesting providers', () => {
		const { Provider, Consumer } = createContext();
		const CONTEXT = { a: 'a' };
		const CHILD_CONTEXT = { b: 'b' };

		class Inner extends Component {
			render(props) {
				return <div>{props.a} - {props.b}</div>;
			}
		}

		sinon.spy(Inner.prototype, 'render');

		render(<Provider value={CONTEXT}>
			<Consumer>
				{data =>
					(<Provider value={CHILD_CONTEXT}>
						<Consumer>
							{childData => <Inner {...data} {...childData} />}
						</Consumer>
					</Provider>)
				}
			</Consumer>
		</Provider>, scratch);

		// initial render does not invoke anything but render():
		expect(Inner.prototype.render).to.have.been.calledWithMatch({ ...CONTEXT, ...CHILD_CONTEXT }, {}, { ['__cC' + (ctxId - 1)]: {} });
		expect(scratch.innerHTML).to.equal('<div>a - b</div>');
	});

	it('should preserve provider context between different providers', () => {
		const { Provider: ThemeProvider, Consumer: ThemeConsumer } = createContext();
		const { Provider: DataProvider, Consumer: DataConsumer } = createContext();
		const THEME_CONTEXT = { theme: 'black' };
		const DATA_CONTEXT = { global: 'a' };

		class Inner extends Component {
			render(props) {
				return <div>{props.theme} - {props.global}</div>;
			}
		}

		sinon.spy(Inner.prototype, 'render');

		render(<ThemeProvider value={THEME_CONTEXT.theme}>
			<DataProvider value={DATA_CONTEXT}>
				<ThemeConsumer>
					{theme => (<DataConsumer>
						{data => <Inner theme={theme} {...data} />}
					</DataConsumer>)}
				</ThemeConsumer>
			</DataProvider>
		</ThemeProvider>, scratch);

		// initial render does not invoke anything but render():
		expect(Inner.prototype.render).to.have.been.calledWithMatch({ ...THEME_CONTEXT, ...DATA_CONTEXT }, {}, { ['__cC' + (ctxId - 1)]: {} });
		expect(scratch.innerHTML).to.equal('<div>black - a</div>');
	});

	it('should preserve provider context through nesting consumers', () => {
		const { Provider, Consumer } = createContext();
		const CONTEXT = { a: 'a' };

		class Inner extends Component {
			render(props) {
				return <div>{props.a}</div>;
			}
		}

		sinon.spy(Inner.prototype, 'render');

		render(<Provider value={CONTEXT}>
			<Consumer>
				{data =>
					(<Consumer>
						{childData => <Inner {...data} {...childData} />}
					</Consumer>)
				}
			</Consumer>
		</Provider>, scratch);

		// initial render does not invoke anything but render():
		expect(Inner.prototype.render).to.have.been.calledWithMatch({ ...CONTEXT }, {}, { ['__cC' + (ctxId - 1)]: {} });
		expect(scratch.innerHTML).to.equal('<div>a</div>');
	});

	it('should preserve provider context through nested components', () => {
		const { Provider, Consumer } = createContext();
		const CONTEXT = { a: 'a' };

		class Consumed extends Component {
			render(props) {
				return <strong>{props.a}</strong>;
			}
		}

		sinon.spy(Consumed.prototype, 'render');

		class Outer extends Component {
			render() {
				return <div><Inner /></div>;
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
							{data => <Consumed {...data} />}
						</Consumer>
					</div>
				);
			}
		}

		render((
			<Provider value={CONTEXT}>
				<Outer />
			</Provider>
		), scratch);

		// initial render does not invoke anything but render():
		expect(Consumed.prototype.render).to.have.been.calledWithMatch({ ...CONTEXT }, {}, { ['__cC' + (ctxId - 1)]: {} });
		expect(scratch.innerHTML).to.equal('<div><div><strong>a</strong></div></div>');
	});

	it('should keep the right context at the right "depth"', () => {
		const { Provider, Consumer } = createContext();
		const CONTEXT = { theme: 'a', global: 1 };
		const NESTED_CONTEXT = { theme: 'b', global: 1 };

		class Inner extends Component {
			render(props) {
				return <div>{props.theme} - {props.global}</div>;
			}
		}
		class Nested extends Component {
			render(props) {
				return <div>{props.theme} - {props.global}</div>;
			}
		}

		sinon.spy(Inner.prototype, 'render');
		sinon.spy(Nested.prototype, 'render');

		render((
			<Provider value={CONTEXT}>
				<Provider value={NESTED_CONTEXT}>
					<Consumer>
						{data => <Nested {...data} />}
					</Consumer>
				</Provider>
				<Consumer>
					{data => <Inner {...data} />}
				</Consumer>
			</Provider>
		), scratch);

		// initial render does not invoke anything but render():
		expect(Nested.prototype.render).to.have.been.calledWithMatch({ ...NESTED_CONTEXT }, {}, { ['__cC' + (ctxId - 1)]: {} });
		expect(Inner.prototype.render).to.have.been.calledWithMatch({ ...CONTEXT }, {}, { ['__cC' + (ctxId - 1)]: {} });

		expect(scratch.innerHTML).to.equal('<div>b - 1</div><div>a - 1</div>');
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

			render((
				<Provider value="bar">
					<Provider value="bob">
						<App />
					</Provider>
				</Provider>
			), scratch);
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

			render((
				<Foo.Provider value="bar">
					<OldContext>
						<NewContext>
							<Inner />
						</NewContext>
					</OldContext>
				</Foo.Provider>
			), scratch);

			expect(spy).to.be.calledWithMatch({ foo: 'foo' });
		});
	});
});
