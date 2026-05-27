import { createElement, render, options } from 'preact';
import { setupScratch, teardown } from '../../../test/_util/helpers';
import { useState } from 'preact/hooks';
import { addHookName } from 'preact/devtools';
import { vi } from 'vitest';

describe('addHookName', () => {
	/** @type {HTMLDivElement} */
	let scratch;

	beforeEach(() => {
		scratch = setupScratch();
	});

	afterEach(() => {
		teardown(scratch);
		delete options._addHookName;
	});

	it('should do nothing when no options hook is present', () => {
		function useFoo() {
			return addHookName(useState(0), 'foo');
		}

		function App() {
			let [v] = useFoo();
			return <div>{v}</div>;
		}

		expect(() => render(<App />, scratch)).to.not.throw();
	});

	it('should call options hook with value', () => {
		let spy = (options._addHookName = vi.fn());

		function useFoo() {
			return addHookName(useState(0), 'foo');
		}

		function App() {
			let [v] = useFoo();
			return <div>{v}</div>;
		}

		render(<App />, scratch);

		expect(spy).toHaveBeenCalledOnce();
		expect(spy).toHaveBeenCalledWith('foo');
	});
});
