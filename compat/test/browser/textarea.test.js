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

		expect(scratch.firstElementChild.value).to.equal('foo');
	});

	it('should alias defaultValue to children', () => {
		// TODO: IE11 doesn't update `node.value` when
		// `node.defaultValue` is set.
		if (/Trident/.test(navigator.userAgent)) return;

		render(<textarea defaultValue="foo" />, scratch);

		expect(scratch.firstElementChild.value).to.equal('foo');
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
		// Note: This looks counterintuitive, but it's working correctly - the value
		// missing from HTML because innerHTML doesn't serialize form field values.
		// See demo: https://jsfiddle.net/4had2Lu8
		// Related renderToString PR: preactjs/preact-render-to-string#161
		//
		// This is not true for IE11. It displays the value in
		// node.innerHTML regardless.
		if (!/Trident/.test(window.navigator.userAgent)) {
			expect(scratch.innerHTML).to.equal('<textarea></textarea>');
		}
		expect(scratch.firstElementChild.value).to.equal('hello');

		act(() => {
			set('');
		});
		expect(scratch.innerHTML).to.equal('<textarea></textarea>');
		expect(scratch.firstElementChild.value).to.equal('');
	});
});
