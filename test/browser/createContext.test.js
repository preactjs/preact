import { setupRerender } from 'preact/test-utils';
import { createElement as h, render, Component, createContext } from '../../src/index';
import { setupScratch, teardown } from '../_util/helpers';
import { Fragment } from '../../src';
import { i as ctxId } from '../../src/create-context';

/** @jsx h */

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

	it('should preserve provider context through nesting providers', (done) => {
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
		expect(Inner.prototype.render).to.be.calledOnce;
		expect(scratch.innerHTML).to.equal('<div>a - b</div>');
		setTimeout(() => {
			expect(Inner.prototype.render).to.be.calledOnce;
			done();
		}, 0);
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
						<Consumer>
							{data => <Inner {...data} />}
						</Consumer>
					</NoUpdate>
				</Provider>
			</div>, scratch);

		expect(Inner.prototype.render).to.have.been.calledOnce;

		render(
			<div>
				<Provider value={CONTEXT}>
					<NoUpdate>
						<Consumer>
							{data => <Inner {...data} />}
						</Consumer>
					</NoUpdate>
				</Provider>
			</div>, scratch);

		expect(Inner.prototype.render).to.have.been.calledOnce;
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
				return <div><Inner /></div>;
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
						<Consumer>
							{data => <Consumed {...data} />}
						</Consumer>
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

		render((
			<App value={CONTEXT} />
		), scratch);
		expect(scratch.innerHTML).to.equal('<div><div><strong>a</strong></div></div>');
		expect(Consumed.prototype.render).to.have.been.calledOnce;

		render((
			<App value={UPDATED_CONTEXT} />
		), scratch);

		rerender();

		// initial render does not invoke anything but render():
		expect(Consumed.prototype.render).to.have.been.calledTwice;
		// expect(Consumed.prototype.render).to.have.been.calledWithMatch({ ...UPDATED_CONTEXT }, {}, { ['__cC' + (ctxId - 1)]: {} });
		expect(scratch.innerHTML).to.equal('<div><div><strong>b</strong></div></div>');
		setTimeout(() => {
			expect(Consumed.prototype.render).to.have.been.calledTwice;
			done();
		});
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

	it.skip('should not re-render the consumer if the context doesn\'t change', () => {
		const { Provider, Consumer } = createContext();
		const CONTEXT = { i: 1 };

		class Inner extends Component {
			render(props) {
				return <div>{props.i}</div>;
			}
		}

		sinon.spy(Inner.prototype, 'render');

		render(
			<Provider value={CONTEXT}>
				<Consumer>
					{data => <Inner {...data} />}
				</Consumer>
			</Provider>,
			scratch
		);

		render(
			<Provider value={CONTEXT}>
				<Consumer>
					{data => <Inner {...data} />}
				</Consumer>
			</Provider>,
			scratch
		);

		// Rendered twice, should called just one 'Consumer' render
		expect(Inner.prototype.render).to.have.been.calledOnce.and.calledWithMatch(CONTEXT, {},  { ['__cC' + (ctxId - 1)]: {} });
		expect(scratch.innerHTML).to.equal('<div>1</div>');

		render(
			<Provider value={{ i: 2 }}>
				<Consumer>
					{data => <Inner {...data} />}
				</Consumer>
			</Provider>,
			scratch
		);

		// Rendered three times, should call 'Consumer' render two times
		expect(Inner.prototype.render).to.have.been.calledTwice.and.calledWithMatch({ i: 2 }, {},  { ['__cC' + (ctxId - 1)]: {} });
		expect(scratch.innerHTML).to.equal('<div>2</div>');
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

			render((
				<Foo.Provider value="foo">
					<App />
				</Foo.Provider>
			), scratch);

			render(null, scratch);

			expect(spy).to.be.calledOnce;
			expect(spy.getCall(0).args[0]).to.equal(instance);
		});
	});
});
