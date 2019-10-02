import { createElement as h, render, useDebugValue, useState, options } from '../../../src';
import { setupScratch, teardown } from '../../_util/helpers';

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

		expect(() => render(<App />, scratch)).to.not.throw();
	});

	it('should call options hook with value', () => {
		let spy = options.useDebugValue = sinon.spy();

		function useFoo() {
			useDebugValue('foo');
			return useState(0);
		}

		function App() {
			let [v] = useFoo();
			return <div>{v}</div>;
		}

		render(<App />, scratch);

		expect(spy).to.be.calledOnce;
		expect(spy).to.be.calledWith('foo');
	});

	it('should apply optional formatter', () => {
		let spy = options.useDebugValue = sinon.spy();

		function useFoo() {
			useDebugValue('foo', x => x + 'bar');
			return useState(0);
		}

		function App() {
			let [v] = useFoo();
			return <div>{v}</div>;
		}

		render(<App />, scratch);

		expect(spy).to.be.calledOnce;
		expect(spy).to.be.calledWith('foobar');
	});
});
