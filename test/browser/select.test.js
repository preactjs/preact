import { createElement, render } from 'preact';
import { setupScratch, teardown } from '../_util/helpers';

/** @jsx createElement */

describe('Select', () => {
	let scratch;

	beforeEach(() => {
		scratch = setupScratch();
	});

	afterEach(() => {
		teardown(scratch);
	});

	it('should set <select> value', () => {
		function App() {
			return (
				<select value="B">
					<option value="A">A</option>
					<option value="B">B</option>
					<option value="C">C</option>
				</select>
			);
		}

		render(<App />, scratch);
		expect(scratch.firstChild.value).to.equal('B');
	});

	it('should set value with selected', () => {
		function App() {
			return (
				<select>
					<option value="A">A</option>
					<option selected value="B">
						B
					</option>
					<option value="C">C</option>
				</select>
			);
		}

		render(<App />, scratch);
		expect(scratch.firstChild.value).to.equal('B');
	});

	it('should alias onInput to onChange', () => {
		const func = () => {};
		render(<select onInput={func} />, scratch);

		expect(scratch.firstChild._listeners.change).to.not.be.undefined;
		expect(scratch.firstChild._listeners.input).to.be.undefined;
	});

	it('should work with multiple selected', () => {
		function App() {
			return (
				<select multiple>
					<option value="A">A</option>
					<option selected value="B">
						B
					</option>
					<option selected value="C">
						C
					</option>
				</select>
			);
		}

		render(<App />, scratch);
		Array.prototype.slice.call(scratch.firstChild.childNodes).forEach(node => {
			if (node.value === 'B' || node.value === 'C') {
				expect(node.selected).to.equal(true);
			}
		});
		expect(scratch.firstChild.value).to.equal('B');
	});
});
