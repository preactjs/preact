import React, { render } from 'preact/compat';
import { setupScratch, teardown } from '../../../test/_util/helpers';

describe('Textarea', () => {
	// React textarea: https://codesandbox.io/s/react-textarea-py5c6

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

	it('should alias defaultValue to children', () => {
		render(<textarea defaultValue="foo" />, scratch);

		expect(scratch.innerHTML).to.equal('<textarea>foo</textarea>');
	});

	it('should allow using children text if no value or defaultValue is provided', () => {
		render(<textarea>Children text</textarea>, scratch);
		expect(scratch.innerHTML).to.equal('<textarea>Children text</textarea>');
	});

	it('should prioritize value over defaultValue', () => {
		render(
			<textarea value="Value prop" defaultValue="defaultValue prop" />,
			scratch
		);
		expect(scratch.innerHTML).to.equal('<textarea>Value prop</textarea>');
	});

	it('should prioritize value prop over defaultValue and children', () => {
		render(
			<textarea value="Value prop" defaultValue="defaultValue prop">
				Children text
			</textarea>,
			scratch
		);
		expect(scratch.innerHTML).to.equal('<textarea>Value prop</textarea>');
	});
});
