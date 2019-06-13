import { h, render, options } from 'preact';
import { setupScratch, teardown } from '../../../test/_util/helpers';
import { useDebugValue, useState } from '../../src';

/** @jsx h */

describe('useDebugValue', () => {

	/** @type {HTMLDivElement} */
	let scratch;

	beforeEach(() => {
		scratch = setupScratch();
	});

	afterEach(() => {
		teardown(scratch);
		delete options.useDebugValue;
	});

	it('should do nothing when no options hook is present', () => {
		function useFoo() {
			useDebugValue('foo');
			return useState(0);
		}

		function App() {
			let [v] = useFoo();
			return <div>{v}</div>;
		}

		expect(() => render(<App />, scratch)).not.toThrowError();
	});

	it('should call options hook with value', () => {
		let spy = options.useDebugValue = jasmine.createSpy('useDebugValue');

		function useFoo() {
			useDebugValue('foo');
			return useState(0);
		}

		function App() {
			let [v] = useFoo();
			return <div>{v}</div>;
		}

		render(<App />, scratch);

		expect(spy).toHaveBeenCalledTimes(1);
		expect(spy).toHaveBeenCalledWith('foo');
	});

	it('should apply optional formatter', () => {
		let spy = options.useDebugValue = jasmine.createSpy('useDebugValue');

		function useFoo() {
			useDebugValue('foo', x => x + 'bar');
			return useState(0);
		}

		function App() {
			let [v] = useFoo();
			return <div>{v}</div>;
		}

		render(<App />, scratch);

		expect(spy).toHaveBeenCalledTimes(1);
		expect(spy).toHaveBeenCalledWith('foobar');
	});
});
