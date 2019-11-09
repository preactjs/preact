import { setupRerender } from 'preact/test-utils';
import { createElement, render, Component, Fragment, hydrate } from 'preact';
import { setupScratch, teardown } from '../_util/helpers';
import { div, span, input as inputStr, h1, h2 } from '../_util/dom';

/** @jsx createElement */
/* eslint-disable react/jsx-boolean-value */

describe('focus', () => {
	/** @type {HTMLDivElement} */
	let scratch;

	/** @type {() => void} */
	let rerender;

	const List = ({ children }) => <div>{children}</div>;
	const ListItem = ({ children }) => <span>{children}</span>;
	const InputWithId = ({ i }) => <input id={`input-${i}`} type="text" />;
	const Input = () => <input type="text" />;

	function focusInput() {
		if (!scratch) return;

		const input = scratch.querySelector('input');
		input.value = 'a word';
		input.focus();
		input.setSelectionRange(2, 5);

		expect(document.activeElement).to.equalNode(input);

		return input;
	}

	function focusInputById() {
		if (!scratch) return;

		const input = scratch.querySelector('#input-0');
		input.value = 'a word';
		input.focus();
		input.setSelectionRange(2, 5);

		expect(document.activeElement).to.equalNode(input);

		return input;
	}

	/**
	 * Validate an input tag has maintained focus
	 * @param {HTMLInputElement} input The input to validate
	 * @param {string} [message] Message to show if the activeElement is not
	 * equal to the `input` parameter
	 */
	function validateFocus(input, message) {
		expect(document.activeElement).to.equalNode(input, message);
		expect(input.selectionStart).to.equal(2);
		expect(input.selectionEnd).to.equal(5);
	}

	/**
	 * @param {Array<number | string>} before
	 * @param {Array<number | string>} after
	 */
	function getListHtml(before, after) {
		return div(
			[
				...before.map(i => span(i)),
				inputStr(),
				...after.map(i => span(i))
			].join('')
		);
	}

	beforeEach(() => {
		scratch = setupScratch();
		rerender = setupRerender();
	});

	afterEach(() => {
		teardown(scratch);
	});

	it.skip('should maintain focus when swapping elements', () => {
		render(
			<List>
				<Input />
				<ListItem>fooo</ListItem>
			</List>,
			scratch
		);

		const input = focusInput();
		expect(scratch.innerHTML).to.equal(getListHtml([], ['fooo']));

		render(
			<List>
				<ListItem>fooo</ListItem>
				<Input />
			</List>,
			scratch
		);
		validateFocus(input);
		expect(scratch.innerHTML).to.equal(getListHtml(['fooo'], []));
	});

	it('should maintain focus when moving the input around', () => {
		function App({ showFirst, showLast }) {
			return (
				<List>
					{showFirst ? <ListItem>1</ListItem> : null}
					<Input />
					{showLast ? <ListItem>2</ListItem> : null}
				</List>
			);
		}

		render(<App showFirst={true} showLast={true} />, scratch);

		let input = focusInput();
		render(<App showFirst={false} showLast={true} />, scratch);
		expect(scratch.innerHTML).to.equal(getListHtml([], [2]));
		validateFocus(input, 'move from middle to beginning');

		input = focusInput();
		render(<App showFirst={true} showLast={true} />, scratch);
		expect(scratch.innerHTML).to.equal(getListHtml([1], [2]));
		validateFocus(input, 'move from beginning to middle');

		input = focusInput();
		render(<App showFirst={true} showLast={false} />, scratch);
		expect(scratch.innerHTML).to.equal(getListHtml([1], []));
		validateFocus(input, 'move from middle to end');

		input = focusInput();
		render(<App showFirst={true} showLast={true} />, scratch);
		expect(scratch.innerHTML).to.equal(getListHtml([1], [2]));
		validateFocus(input, 'move from end to middle');
	});

	it('should maintain focus when adding children around input', () => {
		render(
			<List>
				<Input />
			</List>,
			scratch
		);

		let input = focusInput();
		expect(scratch.innerHTML).to.equal(getListHtml([], []));

		render(
			<List>
				<ListItem key="1">1</ListItem>
				<Input />
			</List>,
			scratch
		);

		expect(scratch.innerHTML).to.equal(getListHtml([1], []));
		validateFocus(input, 'insert sibling before');

		render(
			<List>
				<ListItem key="1">1</ListItem>
				<Input />
				<ListItem key="2">2</ListItem>
			</List>,
			scratch
		);

		expect(scratch.innerHTML).to.equal(getListHtml([1], [2]));
		validateFocus(input, 'insert sibling after');

		render(
			<List>
				<ListItem key="1">1</ListItem>
				<Input />
				<ListItem key="2">2</ListItem>
				<ListItem key="3">3</ListItem>
			</List>,
			scratch
		);

		expect(scratch.innerHTML).to.equal(getListHtml([1], [2, 3]));
		validateFocus(input, 'insert sibling after again');

		render(
			<List>
				<ListItem key="0">0</ListItem>
				<ListItem key="1">1</ListItem>
				<Input />
				<ListItem key="2">2</ListItem>
				<ListItem key="3">3</ListItem>
			</List>,
			scratch
		);

		expect(scratch.innerHTML).to.equal(getListHtml([0, 1], [2, 3]));
		validateFocus(input, 'insert sibling before again');
	});

	it('should maintain focus when conditional elements around input', () => {
		render(
			<List>
				<ListItem>0</ListItem>
				<ListItem>1</ListItem>
				<Input />
				<ListItem>2</ListItem>
				<ListItem>3</ListItem>
			</List>,
			scratch
		);

		let input = focusInput();
		expect(scratch.innerHTML).to.equal(getListHtml([0, 1], [2, 3]));

		render(
			<List>
				{false && <ListItem>0</ListItem>}
				<ListItem>1</ListItem>
				<Input />
				<ListItem>2</ListItem>
				<ListItem>3</ListItem>
			</List>,
			scratch
		);

		expect(scratch.innerHTML).to.equal(getListHtml([1], [2, 3]));
		validateFocus(input, 'remove sibling before');

		render(
			<List>
				{false && <ListItem>0</ListItem>}
				<ListItem>1</ListItem>
				<Input />
				<ListItem>2</ListItem>
				{false && <ListItem>3</ListItem>}
			</List>,
			scratch
		);

		expect(scratch.innerHTML).to.equal(getListHtml([1], [2]));
		validateFocus(input, 'remove sibling after');

		render(
			<List>
				{false && <ListItem>0</ListItem>}
				<ListItem>1</ListItem>
				<Input />
				{false && <ListItem>2</ListItem>}
				{false && <ListItem>3</ListItem>}
			</List>,
			scratch
		);

		expect(scratch.innerHTML).to.equal(getListHtml([1], []));
		validateFocus(input, 'remove sibling after 2');

		render(
			<List>
				{false && <ListItem>0</ListItem>}
				{false && <ListItem>1</ListItem>}
				<Input />
				{false && <ListItem>2</ListItem>}
				{false && <ListItem>3</ListItem>}
			</List>,
			scratch
		);

		expect(scratch.innerHTML).to.equal(getListHtml([], []));
		validateFocus(input, 'remove sibling before 2');
	});

	it('should maintain focus when removing elements around input', () => {
		render(
			<List>
				<ListItem key="0">0</ListItem>
				<ListItem key="1">1</ListItem>
				<Input />
				<ListItem key="2">2</ListItem>
				<ListItem key="3">3</ListItem>
			</List>,
			scratch
		);

		let input = focusInput();
		expect(scratch.innerHTML).to.equal(getListHtml([0, 1], [2, 3]));

		render(
			<List>
				<ListItem key="1">1</ListItem>
				<Input />
				<ListItem key="2">2</ListItem>
				<ListItem key="3">3</ListItem>
			</List>,
			scratch
		);

		expect(scratch.innerHTML).to.equal(getListHtml([1], [2, 3]));
		validateFocus(input, 'remove sibling before');

		render(
			<List>
				<ListItem key="1">1</ListItem>
				<Input />
				<ListItem key="2">2</ListItem>
			</List>,
			scratch
		);

		expect(scratch.innerHTML).to.equal(getListHtml([1], [2]));
		validateFocus(input, 'remove sibling after');

		render(
			<List>
				<ListItem key="1">1</ListItem>
				<Input />
			</List>,
			scratch
		);

		expect(scratch.innerHTML).to.equal(getListHtml([1], []));
		validateFocus(input, 'remove sibling after 2');

		render(
			<List>
				<Input />
			</List>,
			scratch
		);

		expect(scratch.innerHTML).to.equal(getListHtml([], []));
		validateFocus(input, 'remove sibling before 2');
	});

	it('should maintain focus when adding input next to the current input', () => {
		render(
			<List>
				<InputWithId i={0} />
			</List>,
			scratch
		);

		let input = focusInputById();

		render(
			<List>
				<Input key="1" />
				<InputWithId i={0} />
			</List>,
			scratch
		);
		validateFocus(input, 'add input before');

		input = focusInputById();

		render(
			<List>
				<Input key="1" />
				<InputWithId i={0} />
				<Input key="2" />
			</List>,
			scratch
		);
		validateFocus(input, 'add input after');

		input = focusInputById();

		render(
			<List>
				<Input key="0" />
				<Input key="1" />
				<InputWithId i={0} />
				<Input key="2" />
			</List>,
			scratch
		);
		validateFocus(input, 'add input first place');

		input = focusInputById();

		render(
			<List>
				<Input key="-1" />
				<Input key="0" />
				<Input key="1" />
				<InputWithId i={0} />
				<Input key="2" />
			</List>,
			scratch
		);
		validateFocus(input, 'add input before');
	});

	it('should maintain focus when hydrating', () => {
		const html = div([span('1'), span('2'), span('3'), inputStr()].join(''));

		scratch.innerHTML = html;
		const input = focusInput();

		hydrate(
			<List>
				<ListItem>1</ListItem>
				<ListItem>2</ListItem>
				<ListItem>3</ListItem>
				<Input />
			</List>,
			scratch
		);

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
								<input type="text" ref={i => (input = i)} />
							</Fragment>
						) : (
							<Fragment>
								<Fragment>
									Hello World
									<h2>yo</h2>
								</Fragment>
								foobar
								<input type="text" ref={i => (input = i)} />
							</Fragment>
						)}
					</div>
				);
			}
		}

		render(<App />, scratch);

		input.focus();
		updateState();

		expect(document.activeElement).to.equalNode(input, 'Before rerender');
		rerender();

		expect(scratch.innerHTML).to.equal(
			div(
				[h1('Heading'), 'Hello World', h2('yo'), 'foobar', inputStr()].join('')
			)
		);
		expect(document.activeElement).to.equalNode(input, 'After rerender');
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
								<input type="text" ref={i => (input = i)} value="foobar" />
							</Fragment>
						) : (
							<Fragment>
								<Fragment>
									Hello World
									<h2>yo</h2>
								</Fragment>
								foobar
								<input type="text" ref={i => (input = i)} value="foobar" />
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

		expect(document.activeElement).to.equalNode(input, 'Before rerender');
		rerender();

		expect(scratch.innerHTML).to.equal(
			div(
				[h1('Heading'), 'Hello World', h2('yo'), 'foobar', inputStr()].join('')
			)
		);
		expect(input.selectionStart).to.equal(2);
		expect(input.selectionEnd).to.equal(5);
		expect(document.activeElement).to.equalNode(input, 'After rerender');
	});
});
