import { setupScratch, teardown } from '../../../test/_util/helpers';
import React from '../../src';

describe('jsx', () => {

	/** @type {HTMLDivElement} */
	let scratch;

	beforeEach(() => {
		scratch = setupScratch();
	});

	afterEach(() => {
		teardown(scratch);
	});

	it('should render react-style', () => {
		let jsx = (
			<div className="foo bar" data-foo="bar">
				<span id="some_id">inner!</span>
				{ ['a', 'b'] }
			</div>
		);

		expect(jsx.props).to.have.property('className', 'foo bar');

		React.render(jsx, scratch);
		expect(scratch.innerHTML).to.equal('<div class="foo bar" data-foo="bar"><span id="some_id">inner!</span>ab</div>');
	});
});
