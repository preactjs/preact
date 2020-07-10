import React, { render, useState } from 'preact/compat';
import { setupScratch, teardown } from '../../../test/_util/helpers';
import { act } from 'preact/test-utils';

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

	it('should alias defaultValue to children', () => {
		render(<textarea defaultValue="foo" />, scratch);

		expect(scratch.innerHTML).to.equal('<textarea>foo</textarea>');
	});

	it('should support resetting the value', () => {
		let set;
		const App = () => {
			const [state, setState] = useState('');
			set = setState;
			return <textarea value={state} />;
		};

		render(<App />, scratch);
		expect(scratch.innerHTML).to.equal('<textarea></textarea>');

		act(() => {
			set('hello');
		});
		expect(scratch.firstElementChild.value).to.equal('hello');
		expect(scratch.innerHTML).to.equal('<textarea>hello</textarea>');

		act(() => {
			set('');
		});
		expect(scratch.innerHTML).to.equal('<textarea></textarea>');
	});
});
