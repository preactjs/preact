import { createElement, render, options } from 'preact';
import { setupScratch, teardown } from '../../../test/_util/helpers';
import { useDebugName, useState } from 'preact/hooks';

/** @jsx createElement */

describe('useDebugName', () => {
	/** @type {HTMLDivElement} */
	let scratch;

	beforeEach(() => {
		scratch = setupScratch();
	});

	afterEach(() => {
		teardown(scratch);
		delete options.useDebugName;
	});

	it('should do nothing when no options hook is present', () => {
		function useFoo() {
			return useDebugName(useState(0), 'foo');
		}

		function App() {
			let [v] = useFoo();
			return <div>{v}</div>;
		}

		expect(() => render(<App />, scratch)).to.not.throw();
	});

	it('should call options hook with value', () => {
		let spy = (options.useDebugName = sinon.spy());

		function useFoo() {
			return useDebugName(useState(0), 'foo');
		}

		function App() {
			let [v] = useFoo();
			return <div>{v}</div>;
		}

		render(<App />, scratch);

		expect(spy).to.be.calledOnce;
		expect(spy).to.be.calledWith('foo');
	});
});
