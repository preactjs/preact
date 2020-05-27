import React, { render } from 'preact/compat';
import { setupScratch, teardown } from '../../../test/_util/helpers';

describe('Textarea', () => {
	let scratch;

	beforeEach(() => {
		scratch = setupScratch();
	});

	afterEach(() => {
		teardown(scratch);
	});

	it('should alias value to children', () => {
		render(<textarea value="foo" />, scratch);

		expect(scratch.innerHTML).to.equal('<textarea>foo</textarea>');
	});
});
