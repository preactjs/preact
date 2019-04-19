import { setupScratch, teardown } from '../../../test/_util/helpers';
import { render, h, Component } from 'preact';
import { setupRerender } from 'preact/test-utils';
import { createMockDevtoolsHook, convertEmit } from './mock-hook';
import { initDevTools } from '../../src/devtools';
import { clearState } from '../../src/devtools/cache';

/** @jsx h */

describe('devtools', () => {

	/** @type {HTMLDivElement} */
	let scratch;

	/** @type {() => void} */
	let rerender;

	/** @type {import('../../src/internal').DevtoolsMock} */
	let mock;

	beforeEach(() => {
		scratch = setupScratch();
		rerender = setupRerender();
		mock = createMockDevtoolsHook();

		/** @type {import('../../src/internal').DevtoolsWindow} */
		(window).__REACT_DEVTOOLS_GLOBAL_HOOK__ = mock.hook;

		initDevTools();
		clearState();
	});

	afterEach(() => {
		teardown(scratch);
	});

	it.skip('should not sent events before marked as connected', () => {
		// TODO
	});

	it('should mount a functional component', () => {
		mock.connect();

		function App() {
			return <h1>Hello World</h1>;
		}

		render(<App />, scratch);
		expect(mock.hook.emit).to.be.calledOnce;
		expect(convertEmit(mock.hook.emit.args[0])).to.deep.equal([
			1,
			1,
			1,
			1,
			10,
			1,
			0, // TODO
			1,
			2,
			4,
			1,
			0,
			3,
			65,
			112,
			112,
			0
		]);
	});

	it('should mount nested functional components', () => {
		mock.connect();

		function Foo() {
			return 'foo';
		}

		function App() {
			return <h1><Foo /></h1>;
		}

		render(<App />, scratch);

		expect(mock.hook.emit).to.be.calledOnce;
		expect(convertEmit(mock.hook.emit.args[0])).to.deep.equal([
			1,
			1,
			1,
			1,
			10,
			1,
			0, // TODO
			1,
			2,
			4,
			1,
			0,
			3,
			65,
			112,
			112,
			0,
			1,
			3,
			4,
			2,
			2,
			3,
			70,
			111,
			111,
			0
		]);
	});

	describe('inspectElement', () => {
		it('should provide props', () => {
			mock.connect();
			let App = props => <div />;
			render(<App foo bar="bar" bob={2} baz={{ foo: 1 }} boof={[1]} />, scratch);

			expect(mock.inspect(2).props).to.deep.equal({
				cleaned: [],
				data: {
					foo: true,
					bar: 'bar',
					baz: {
						foo: 1
					},
					bob: 2,
					boof: [1]
				}
			});
		});

		it('should not provide state for functional components', () => {
			mock.connect();
			let App = () => <div />;
			render(<App />, scratch);
			expect(mock.inspect(2).state).to.equal(null);
		});

		it('should provide state for class components', () => {
			mock.connect();
			class App extends Component {
				constructor(props) {
					super(props);
					this.state = { foo: 1 };
				}
				render() {
					return <div />;
				}
			}

			render(<App />, scratch);

			expect(mock.inspect(2).state).to.deep.equal({
				cleaned: [],
				data: {
					foo: 1
				}
			});
		});

		it('should edit state', () => {
			mock.connect();
			class App extends Component {
				constructor(props) {
					super(props);
					this.state = { foo: 1 };
				}
				render() {
					return <div />;
				}
			}

			render(<App />, scratch);

			expect(mock.inspect(2).state).to.deep.equal({
				cleaned: [],
				data: {
					foo: 1
				}
			});

			mock.setState(2, ['foo'], 42);
			rerender();

			expect(mock.inspect(2).state).to.deep.equal({
				cleaned: [],
				data: {
					foo: 42
				}
			});
		});
	});
});
