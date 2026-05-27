import React, { createElement, render, hydrate, useState } from 'preact/compat';
import ReactDOMServer from 'preact/compat/server';
import { setupScratch, teardown } from '../../../test/_util/helpers';
import { act } from 'preact/test-utils';

describe('Textarea', () => {
	/** @type {HTMLElement} */
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

	it('should hydrate textarea value', () => {
		function App() {
			return <textarea value="foo" />;
		}

		scratch.innerHTML = ReactDOMServer.renderToString(<App />);
		expect(scratch.firstElementChild.value).to.equal('foo');
		expect(scratch.innerHTML).to.be.equal('<textarea>foo</textarea>');

		hydrate(<App />, scratch);
		expect(scratch.firstElementChild.value).to.equal('foo');

		expect(scratch.innerHTML).to.be.equal('<textarea></textarea>');
	});

	it('should alias defaultValue to children', () => {
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
		expect(scratch.innerHTML).to.equal('<textarea></textarea>');
		expect(scratch.firstElementChild.value).to.equal('hello');

		act(() => {
			set('');
		});
		expect(scratch.innerHTML).to.equal('<textarea></textarea>');
		expect(scratch.firstElementChild.value).to.equal('');
	});
});
