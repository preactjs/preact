import { createElement as h, render, Component, Fragment, hydrate } from '../../src/index';
import { setupScratch, teardown, setupRerender } from '../_util/helpers';
import { div, span, input as inputStr } from '../_util/dom';
/* eslint-disable react/jsx-boolean-value */

/** @jsx h */
describe('focus', () => {

	/** @type {HTMLDivElement} */
	let scratch;

	/** @type {() => void} */
	let rerender;

	const List = ({ children }) => <div>{children}</div>;
	const ListItem = ({ children }) => <span>{children}</span>;
	const Input = () => <input type="text" />;

	function focusInput() {
		if (!scratch) return;

		const input = scratch.querySelector('input');
		input.value = 'a word';
		input.focus();
		input.setSelectionRange(2, 5);

		expect(document.activeElement).to.equal(input);

		return input;
	}

	/**
	 * Validate an input tag has maintained focus
	 * @param {HTMLInputElement} input The input to validate
	 * @param {string} [message] Message to show if the activeElement is not
	 * eqaul to the `input` parameter
	 */
	function validateFocus(input, message) {
		expect(document.activeElement).to.equal(input, message);
		expect(input.selectionStart).to.equal(2);
		expect(input.selectionEnd).to.equal(5);

	}

	beforeEach(() => {
		scratch = setupScratch();
		rerender = setupRerender();
	});

	afterEach(() => {
		teardown(scratch);
	});

	it('should maintain focus when swapping elements', () => {
		render((
			<List>
				<Input />
				<ListItem>fooo</ListItem>
			</List>
		), scratch);

		const input = focusInput();

		render((
			<List>
				<ListItem>fooo</ListItem>
				<Input />
			</List>
		), scratch);
		validateFocus(input);
	});

	it('should maintain focus when moving input to beginning, end, and middle of children', () => {
		render((
			<List>
				<ListItem>1</ListItem>
				<ListItem>2</ListItem>
				<ListItem>3</ListItem>
				<ListItem>4</ListItem>
				<Input />
			</List>
		), scratch);

		let input = focusInput();

		render((
			<List>
				<Input />
				<ListItem>1</ListItem>
				<ListItem>2</ListItem>
				<ListItem>3</ListItem>
				<ListItem>4</ListItem>
			</List>
		), scratch);
		validateFocus(input, 'Moving from end to beginning');

		input = focusInput();

		render((
			<List>
				<ListItem>1</ListItem>
				<ListItem>2</ListItem>
				<ListItem>3</ListItem>
				<ListItem>4</ListItem>
				<Input />
			</List>
		), scratch);
		validateFocus(input, 'Moving from beginning to end');

		input = focusInput();

		render((
			<List>
				<ListItem>1</ListItem>
				<ListItem>2</ListItem>
				<Input />
				<ListItem>3</ListItem>
				<ListItem>4</ListItem>
			</List>
		), scratch);
		validateFocus(input, 'Moving from end to middle');

		input = focusInput();

		render((
			<List>
				<Input />
				<ListItem>1</ListItem>
				<ListItem>2</ListItem>
				<ListItem>3</ListItem>
				<ListItem>4</ListItem>
			</List>
		), scratch);
		validateFocus(input, 'Moving from middle to beginning');

		input = focusInput();

		render((
			<List>
				<ListItem>1</ListItem>
				<ListItem>2</ListItem>
				<Input />
				<ListItem>3</ListItem>
				<ListItem>4</ListItem>
			</List>
		), scratch);
		validateFocus(input, 'Moving from beginning to middle');

		input = focusInput();

		render((
			<List>
				<ListItem>1</ListItem>
				<ListItem>2</ListItem>
				<ListItem>3</ListItem>
				<ListItem>4</ListItem>
				<Input />
			</List>
		), scratch);
		validateFocus(input, 'Moving from middle to end');
	});

	it('should maintain focus when adding children around input', () => {
		render((
			<List>
				<Input />
			</List>
		), scratch);

		let input = focusInput();

		render((
			<List>
				<ListItem>1</ListItem>
				<Input />
			</List>
		), scratch);
		validateFocus(input, 'insert sibling before');

		input = focusInput();

		render((
			<List>
				<ListItem>1</ListItem>
				<Input />
				<ListItem>2</ListItem>
			</List>
		), scratch);
		validateFocus(input, 'insert sibling after');

		input = focusInput();

		render((
			<List>
				<ListItem>1</ListItem>
				<Input />
				<ListItem>2</ListItem>
				<ListItem>3</ListItem>
			</List>
		), scratch);
		validateFocus(input, 'insert sibling after again');

		input = focusInput();

		render((
			<List>
				<ListItem>0</ListItem>
				<ListItem>1</ListItem>
				<Input />
				<ListItem>2</ListItem>
				<ListItem>3</ListItem>
			</List>
		), scratch);
		validateFocus(input, 'insert sibling before again');
	});

	it('should maintain focus when removing elements around input', () => {
		render((
			<List>
				<ListItem>0</ListItem>
				<ListItem>1</ListItem>
				<Input />
				<ListItem>2</ListItem>
				<ListItem>3</ListItem>
			</List>
		), scratch);

		let input = focusInput();

		input = focusInput();

		render((
			<List>
				<ListItem>1</ListItem>
				<Input />
				<ListItem>2</ListItem>
				<ListItem>3</ListItem>
			</List>
		), scratch);
		validateFocus(input, 'remove sibling before');

		input = focusInput();

		render((
			<List>
				<ListItem>1</ListItem>
				<Input />
				<ListItem>2</ListItem>
			</List>
		), scratch);
		validateFocus(input, 'remove sibling after');

		input = focusInput();

		render((
			<List>
				<ListItem>1</ListItem>
				<Input />
			</List>
		), scratch);
		validateFocus(input, 'remove sibling after 2');

		input = focusInput();

		render((
			<List>
				<Input />
			</List>
		), scratch);
		validateFocus(input, 'remove sibling before 2');
	});

	it('should maintain focus when hydrating', () => {
		const html = div([
			span('1'),
			span('2'),
			span('3'),
			inputStr()
		].join(''));

		scratch.innerHTML = html;
		const input = focusInput();

		hydrate((
			<List>
				<ListItem>1</ListItem>
				<ListItem>2</ListItem>
				<ListItem>3</ListItem>
				<Input />
			</List>
		), scratch);

		expect(scratch.innerHTML).to.equal(html);
		validateFocus(input);
	});

	it('should keep focus in Fragments', () => {

		/** @type {HTMLInputElement} */
		let input;

		/** @type {() => void} */
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

		/** @type {() => void} */
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
