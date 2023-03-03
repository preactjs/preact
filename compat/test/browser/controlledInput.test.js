import {
	setupScratch,
	teardown,
	createEvent
} from '../../../test/_util/helpers';

import React, {
	render,
	createElement,
	Component,
	useState
} from 'preact/compat';
import { setupRerender } from 'preact/test-utils';

describe('preact/compat controlled inputs', () => {
	/** @type {HTMLDivElement} */
	let scratch;
	/** @type {() => void} */
	let rerender;

	function fireEvent(on, type) {
		let e = createEvent(type);
		on.dispatchEvent(e);
	}

	beforeEach(() => {
		scratch = setupScratch();
		rerender = setupRerender();
	});

	afterEach(() => {
		teardown(scratch);
	});

	it('should support controlled inputs', () => {
		const calls = [];
		class Input extends Component {
			constructor(props) {
				super(props);
				this.state = { text: '' };
				this.onInput = this.onInput.bind(this);
			}

			onInput(e) {
				calls.push(e.target.value);
				if (e.target.value.length > 3) return;
				this.setState({ text: e.target.value });
			}

			render() {
				return <input onInput={this.onInput} value={this.state.text} />;
			}
		}

		render(<Input />, scratch);

		scratch.firstChild.value = 'hii';
		fireEvent(scratch.firstChild, 'input');
		rerender();
		expect(calls).to.deep.equal(['hii']);
		expect(scratch.firstChild.value).to.equal('hii');

		scratch.firstChild.value = 'hiii';
		fireEvent(scratch.firstChild, 'input');
		rerender();
		expect(calls).to.deep.equal(['hii', 'hiii']);
		expect(scratch.firstChild.value).to.equal('hii');
	});

	it('should support controlled inputs with bailed out rerenders', () => {
		const calls = [];
		function Input() {
			const [value, setValue] = useState('');
			return (
				<input
					value={value}
					onInput={e => {
						calls.push(e.target.value);
						setValue(e.target.value.toUpperCase().slice(0, 3));
					}}
				/>
			);
		}

		render(<Input />, scratch);

		scratch.firstChild.value = 'hii';
		fireEvent(scratch.firstChild, 'input');
		rerender();
		expect(calls).to.deep.equal(['hii']);
		expect(scratch.firstChild.value).to.equal('HII');

		scratch.firstChild.value = 'hiii';
		fireEvent(scratch.firstChild, 'input');
		rerender();
		expect(calls).to.deep.equal(['hii', 'hiii']);
		expect(scratch.firstChild.value).to.equal('HII');
	});

	it('should support controlled textareas', () => {
		const calls = [];
		class Input extends Component {
			constructor(props) {
				super(props);
				this.state = { text: '' };
				this.onInput = this.onInput.bind(this);
			}

			onInput(e) {
				calls.push(e.target.value);
				if (e.target.value.length > 3) return;
				this.setState({ text: e.target.value });
			}

			render() {
				return <textarea onInput={this.onInput} value={this.state.text} />;
			}
		}

		render(<Input />, scratch);

		scratch.firstChild.value = 'hii';
		fireEvent(scratch.firstChild, 'input');
		rerender();
		expect(calls).to.deep.equal(['hii']);
		expect(scratch.firstChild.value).to.equal('hii');

		scratch.firstChild.value = 'hiii';
		fireEvent(scratch.firstChild, 'input');
		rerender();
		expect(calls).to.deep.equal(['hii', 'hiii']);
		expect(scratch.firstChild.value).to.equal('hii');
	});

	it('should support controlled selects', () => {
		const calls = [];
		class Input extends Component {
			constructor(props) {
				super(props);
				this.state = { value: 'B' };
				this.onChange = this.onChange.bind(this);
			}

			onChange(e) {
				calls.push(e.target.value);
				if (e.target.value === 'C') return;

				this.setState({ value: e.target.value });
			}

			render() {
				return (
					<select value={this.state.value} onChange={this.onChange}>
						<option value="A">A</option>
						<option value="B">B</option>
						<option value="C">C</option>
					</select>
				);
			}
		}

		render(<Input />, scratch);

		scratch.firstChild.value = 'A';
		fireEvent(scratch.firstChild, 'change');
		rerender();
		expect(calls).to.deep.equal(['A']);
		expect(scratch.firstChild.value).to.equal('A');

		scratch.firstChild.value = 'C';
		fireEvent(scratch.firstChild, 'change');
		rerender();
		expect(calls).to.deep.equal(['A', 'C']);
		expect(scratch.firstChild.value).to.equal('A');
	});

	it('should support controlled checkboxes', () => {
		const calls = [];
		class Input extends Component {
			constructor(props) {
				super(props);
				this.state = { checked: true };
				this.onInput = this.onInput.bind(this);
			}

			onInput(e) {
				calls.push(e.target.checked);
				if (e.target.checked === false) return;
				this.setState({ checked: e.target.checked });
			}

			render() {
				return (
					<input
						type="checkbox"
						onChange={this.onInput}
						checked={this.state.checked}
					/>
				);
			}
		}

		render(<Input />, scratch);

		scratch.firstChild.checked = false;
		fireEvent(scratch.firstChild, 'change');
		rerender();
		expect(calls).to.deep.equal([false]);
		expect(scratch.firstChild.checked).to.equal(true);
	});
});
