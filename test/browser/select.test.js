import { createElement as h, render } from '../../src/index';
import { setupScratch, teardown } from '../_util/helpers';

/** @jsx h */

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
					<option selected value="B">B</option>
					<option value="C">C</option>
				</select>
			);
		}

		render(<App />, scratch);
		expect(scratch.firstChild.value).to.equal('B');
	});

	it('should work with multiple selected', () => {
		function App() {
			return (
				<select multiple>
					<option value="A">A</option>
					<option selected value="B">B</option>
					<option selected value="C">C</option>
				</select>
			);
		}

		render(<App />, scratch);
		expect(scratch.firstChild.value).to.equal('B');
	});
});
