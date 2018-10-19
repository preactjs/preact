import { createElement as h, render, Component, createContext } from '../../src/index';
import { setupScratch, teardown } from '../_util/helpers';

/** @jsx h */

describe('context', () => {
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
		expect(Inner.prototype.render).to.have.been.calledWith(CONTEXT, {}, {});
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
		expect(Inner.prototype.render).to.have.been.calledWith({ ...CONTEXT, ...CHILD_CONTEXT }, {}, {});
		expect(scratch.innerHTML).to.equal('<div>a - b</div>');
	});

	it('should preserve provider context between different providers', () => {
		const { Provider: ThemeProvider, Consumer: ThemeConsumer } = createContext();
		const { Provider: DataProvider, Consumer: DataConsumer } = createContext();
		const THEME_CONTEXT = { theme: 'black'};
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
		expect(Inner.prototype.render).to.have.been.calledWith({ ...THEME_CONTEXT, ...DATA_CONTEXT }, {}, {});
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
		expect(Inner.prototype.render).to.have.been.calledWith({ ...CONTEXT }, {}, {});
		expect(scratch.innerHTML).to.equal('<div>a</div>');
	});
});
