import { setupScratch, teardown } from '../../../test/_util/helpers';
import { createElement, render } from 'preact/compat';

describe('Select', () => {
	let scratch;

	beforeEach(() => {
		scratch = setupScratch();
	});

	afterEach(() => {
		teardown(scratch);
	});

	it('should work with multiple selected (array of values)', () => {
		function App() {
			return (
				<select multiple value={['B', 'C']}>
					<option value="A">A</option>
					<option value="B">B</option>
					<option value="C">C</option>
				</select>
			);
		}

		render(<App />, scratch);
		const options = scratch.firstChild.children;
		expect(options[0]).to.have.property('selected', false);
		expect(options[1]).to.have.property('selected', true);
		expect(options[2]).to.have.property('selected', true);
		expect(scratch.firstChild.value).to.equal('B');
	});

	it('should work with multiple selected values inside an optgroup', () => {
		function App() {
			return (
				<select multiple value={['B', 'C']}>
					<option value="A">A</option>
					<optgroup label="Group">
						<option value="B">B</option>
						<option value="C">C</option>
					</optgroup>
				</select>
			);
		}

		render(<App />, scratch);
		const options = scratch.firstChild.options;
		expect(options[0]).to.have.property('selected', false);
		expect(options[1]).to.have.property('selected', true);
		expect(options[2]).to.have.property('selected', true);
	});

	it('should support defaultValue for options inside an optgroup', () => {
		function App() {
			return (
				<select defaultValue="2">
					<optgroup label="Group">
						<option value="1">1</option>
						<option value="2">2</option>
					</optgroup>
				</select>
			);
		}

		render(<App />, scratch);
		expect(scratch.firstChild.value).to.equal('2');
		expect(scratch.firstChild.options[1]).to.have.property('selected', true);
	});
});
