import { setupScratch, teardown } from '../../../test/_util/helpers';
import { render, createElement as h } from '../../src';

/** @jsx h */

describe('Select', () => {
	let scratch;

	beforeEach(() => {
		scratch = setupScratch();
	});

	afterEach(() => {
		teardown(scratch);
	});


	it.only('should work with multiple selected (array of values)', () => {
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
		Array.prototype.slice.call(scratch.firstChild.childNodes).forEach(node => {
			if (node.value === 'B' || node.value === 'C') {
				expect(node.selected).to.equal(true);
			}
		});
		expect(scratch.firstChild.value).to.equal('B');
	});
});
