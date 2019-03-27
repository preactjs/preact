import { options, createElement as h, render } from 'preact';
import { useEffect, useState } from 'preact/hooks';

import { setupScratch, teardown } from '../../../test/_util/helpers';
import { act } from '../../src';

/** @jsx h */
describe('act', () => {

	/** @type {HTMLDivElement} */
	let scratch;

	beforeEach(() => {
		scratch = setupScratch();
	});

	afterEach(() => {
		teardown(scratch);
	});

	it('should reset options after act finishes', () => {
		expect(options.requestAnimationFrame).to.equal(undefined);
		act(() => null);
		expect(options.requestAnimationFrame).to.equal(undefined);
	});

	it('should flush pending effects', () => {
		let spy = sinon.spy();
		function StateContainer() {
			useEffect(spy);
			return <div />;
		}
		act(() => render(<StateContainer />, scratch));
		expect(spy).to.be.calledOnce;
	});

	it('should flush pending and initial effects', () => {
		const spy = sinon.spy();
		function StateContainer() {
			const [count, setCount] = useState(0);
			useEffect(() => spy(), [count]);
			return (
				<div>
					<p>Count: {count}</p>
					<button onClick={() => setCount(c => c + 11)} />
				</div>
			);
		}

		act(() => render(<StateContainer />, scratch));
		expect(spy).to.be.calledOnce;
		expect(scratch.textContent).to.include('Count: 0');
		act(() => {
			const button = scratch.querySelector('button');
			button.click();
			expect(spy).to.be.calledOnce;
			expect(scratch.textContent).to.include('Count: 0');
		});
		expect(spy).to.be.calledTwice;
		expect(scratch.textContent).to.include('Count: 1');
	});

	it('should drain the queue of hooks', () => {
		const spy = sinon.spy();
		function StateContainer() {
			const [count, setCount] = useState(0);
			useEffect(() => spy());
			return (<div>
				<p>Count: {count}</p>
				<button onClick={() => setCount(c => c + 11)} />
			</div>);
		}

		render(<StateContainer />, scratch);
		expect(scratch.textContent).to.include('Count: 0');
		act(() => {
			const button = scratch.querySelector('button');
			button.click();
			expect(scratch.textContent).to.include('Count: 0');
		});
		expect(scratch.textContent).to.include('Count: 1');
	});

	it('should restore options.requestAnimationFrame', () => {
		const spy = sinon.spy();

		options.requestAnimationFrame = spy;
		act(() => null);

		expect(options.requestAnimationFrame).to.equal(spy);
		expect(spy).to.not.be.called;
	});
});
