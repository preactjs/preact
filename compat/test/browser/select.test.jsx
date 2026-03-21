import { setupScratch, teardown } from '../../../test/_util/helpers';
import React, { createElement, render } from 'preact/compat';

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
});
