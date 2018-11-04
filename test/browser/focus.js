import { createElement as h, render, Component, Fragment } from '../../src/index';
import { setupScratch, teardown, setupRerender } from '../_util/helpers';
/* eslint-disable react/jsx-boolean-value */

/** @jsx h */
describe('focus', () => {

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

	it('should not lose focus', () => {
		function Foo({ condition }) {
			return (
				<div>
					{condition ? <input /> : <span>fooo</span>}
					{condition ? <span>fooo</span> : <input />}
				</div>
			);
		}

		render(<Foo condition={true} />, scratch);
		let input = scratch.querySelector('input');

		input.focus();
		expect(document.activeElement).to.equal(input);

		render(<Foo condition={false} />, scratch);
		expect(document.activeElement).to.equal(input);
	});

	it('should keep focus in Fragments', () => {

		/** @type {HTMLInputElement} */
		let input;
		let updateState;

		class App extends Component {
			constructor() {
				super();
				this.state = { active: false };
				updateState = () => this.setState(prev => ({ active: !prev.active }));
			}

			render() {
				return (
					<div>
						<h1>Heading</h1>
						{!this.state.active ? (
							<Fragment>
								foobar
								<Fragment>
									Hello World
									<h2>yo</h2>
								</Fragment>
								<input type="text" ref={i => input = i} />
							</Fragment>
						) : (
							<Fragment>
								<Fragment>
									Hello World
									<h2>yo</h2>
								</Fragment>
								foobar
								<input type="text" ref={i => input = i} />
							</Fragment>
						)}
					</div>
				);
			}
		}

		render(<App />, scratch);

		input.focus();
		updateState();

		expect(document.activeElement).to.equal(input, 'Before rerender');
		rerender();

		expect(document.activeElement).to.equal(input, 'After rerender');
	});

	it('should keep text selection', () => {

		/** @type {HTMLInputElement} */
		let input;
		let updateState;

		class App extends Component {
			constructor() {
				super();
				this.state = { active: false };
				updateState = () => this.setState(prev => ({ active: !prev.active }));
			}

			render() {
				return (
					<div>
						<h1>Heading</h1>
						{!this.state.active ? (
							<Fragment>
								foobar
								<Fragment>
									Hello World
									<h2>yo</h2>
								</Fragment>
								<input type="text" ref={i => input = i} value="foobar" />
							</Fragment>
						) : (
							<Fragment>
								<Fragment>
									Hello World
									<h2>yo</h2>
								</Fragment>
								foobar
								<input type="text" ref={i => input = i} value="foobar" />
							</Fragment>
						)}
					</div>
				);
			}
		}

		render(<App />, scratch);

		input.focus();
		input.setSelectionRange(2, 5);
		updateState();

		expect(document.activeElement).to.equal(input, 'Before rerender');
		rerender();

		expect(input.selectionStart).to.equal(2);
		expect(input.selectionEnd).to.equal(5);
		expect(document.activeElement).to.equal(input, 'After rerender');
	});
});
