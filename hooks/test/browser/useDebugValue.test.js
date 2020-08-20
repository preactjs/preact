import { createElement, createRoot, options } from 'preact';
import { setupScratch, teardown } from '../../../test/_util/helpers';
import { useDebugValue, useState } from 'preact/hooks';

/** @jsx createElement*/

describe('useDebugValue', () => {
	/** @type {HTMLDivElement} */
	let scratch;

	let render;

	beforeEach(() => {
		scratch = setupScratch();
		({ render } = createRoot(scratch));
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

		expect(() => render(<App />)).to.not.throw();
	});

	it('should call options hook with value', () => {
		let spy = (options.useDebugValue = sinon.spy());

		function useFoo() {
			useDebugValue('foo');
			return useState(0);
		}

		function App() {
			let [v] = useFoo();
			return <div>{v}</div>;
		}

		render(<App />);

		expect(spy).to.be.calledOnce;
		expect(spy).to.be.calledWith('foo');
	});

	it('should apply optional formatter', () => {
		let spy = (options.useDebugValue = sinon.spy());

		function useFoo() {
			useDebugValue('foo', x => x + 'bar');
			return useState(0);
		}

		function App() {
			let [v] = useFoo();
			return <div>{v}</div>;
		}

		render(<App />);

		expect(spy).to.be.calledOnce;
		expect(spy).to.be.calledWith('foobar');
	});
});
