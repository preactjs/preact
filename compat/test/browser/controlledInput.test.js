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

describe('preact/compat controlled inputs', () => {
	/** @type {HTMLDivElement} */
	let scratch;

	/**
	 * @param {EventTarget} on
	 * @param {string} type
	 * @returns {Promise<void>}
	 */
	function fireEvent(on, type) {
		let e = createEvent(type);
		on.dispatchEvent(e);
		// Flush the microtask queue after dispatching an event by returning a
		// Promise to mimic what the browser would do after invoking event handlers.
		// Technically, this test does it only after all event handlers have been
		// invoked, whereas a real event dispatched by a browser would do it after
		// each event handler.
		return Promise.resolve();
	}

	beforeEach(() => {
		scratch = setupScratch();
	});

	afterEach(() => {
		teardown(scratch);
	});

	it('should support controlled inputs', async () => {
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
		await fireEvent(scratch.firstChild, 'input');
		expect(calls).to.deep.equal(['hii']);
		expect(scratch.firstChild.value).to.equal('hii');

		scratch.firstChild.value = 'hiii';
		await fireEvent(scratch.firstChild, 'input');
		expect(calls).to.deep.equal(['hii', 'hiii']);
		expect(scratch.firstChild.value).to.equal('hii');
	});

	it('should support controlled inputs with bailed out rerenders', async () => {
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
		await fireEvent(scratch.firstChild, 'input');
		expect(calls).to.deep.equal(['hii']);
		expect(scratch.firstChild.value).to.equal('HII');

		scratch.firstChild.value = 'hiii';
		await fireEvent(scratch.firstChild, 'input');
		expect(calls).to.deep.equal(['hii', 'hiii']);
		expect(scratch.firstChild.value).to.equal('HII');

		scratch.firstChild.value = 'ahiii';
		await fireEvent(scratch.firstChild, 'input');
		expect(calls).to.deep.equal(['hii', 'hiii', 'ahiii']);
		expect(scratch.firstChild.value).to.equal('AHI');
	});

	it('should support controlled textareas', async () => {
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
		await fireEvent(scratch.firstChild, 'input');
		expect(calls).to.deep.equal(['hii']);
		expect(scratch.firstChild.value).to.equal('hii');

		scratch.firstChild.value = 'hiii';
		await fireEvent(scratch.firstChild, 'input');
		expect(calls).to.deep.equal(['hii', 'hiii']);
		expect(scratch.firstChild.value).to.equal('hii');
	});

	it('should support controlled selects', async () => {
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
		await fireEvent(scratch.firstChild, 'change');
		expect(calls).to.deep.equal(['A']);
		expect(scratch.firstChild.value).to.equal('A');

		scratch.firstChild.value = 'C';
		await fireEvent(scratch.firstChild, 'change');
		expect(calls).to.deep.equal(['A', 'C']);
		expect(scratch.firstChild.value).to.equal('A');
	});

	it('should support controlled checkboxes', async () => {
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
		await fireEvent(scratch.firstChild, 'change');
		// Have to wait for the microtick
		await new Promise(res => setTimeout(res));
		expect(calls).to.deep.equal([false]);
		expect(scratch.firstChild.checked).to.equal(true);
	});
});
