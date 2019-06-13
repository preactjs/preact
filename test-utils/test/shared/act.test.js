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
		options.debounceRendering = undefined;
	});

	it('should reset options after act finishes', () => {
		expect(options.requestAnimationFrame).toBeUndefined();
		act(() => null);
		expect(options.requestAnimationFrame).toBeUndefined();
	});

	it('should flush pending effects', () => {
		let spy = jasmine.createSpy('effect');
		function StateContainer() {
			useEffect(spy);
			return <div />;
		}
		act(() => render(<StateContainer />, scratch));
		expect(spy).toHaveBeenCalledTimes(1);
	});

	it('should flush pending and initial effects', () => {
		const spy = jasmine.createSpy('effect');
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
		expect(spy).toHaveBeenCalledTimes(1);
		expect(scratch.textContent).toEqual(jasmine.arrayContaining(['Count: 0']));
		act(() => {
			const button = scratch.querySelector('button');
			button.click();
			expect(spy).toHaveBeenCalledTimes(1);
			expect(scratch.textContent).toEqual(jasmine.arrayContaining(['Count: 0']));
		});
		expect(spy).toHaveBeenCalledTimes(2);
		expect(scratch.textContent).toEqual(jasmine.arrayContaining(['Count: 1']));
	});

	it('should flush series of hooks', () => {
		const spy = jasmine.createSpy('effect1');
		const spy2 = jasmine.createSpy('effect2');
		function StateContainer() {
			const [count, setCount] = useState(0);
			useEffect(() => {
				spy();
				if (count===1) {
					setCount(() => 2);
				}
			}, [count]);
			useEffect(() => {
				if (count === 2) {
					spy2();
					setCount(() => 4);
					return () => setCount(() => 3);
				}
			}, [count]);
			return (
				<div>
					<p>Count: {count}</p>
					<button onClick={() => setCount(c => c + 1)} />
				</div>
			);
		}
		act(() => render(<StateContainer />, scratch));
		expect(spy).toHaveBeenCalledTimes(1);
		expect(scratch.textContent).toEqual(jasmine.arrayContaining(['Count: 0']));
		act(() => {
			const button = scratch.querySelector('button');
			button.click();
		});
		expect(spy).toHaveBeenCalledTimes(5);
		expect(spy2).toHaveBeenCalledTimes(1);
		expect(scratch.textContent).toEqual(jasmine.arrayContaining(['Count: 3']));
	});

	it('should drain the queue of hooks', () => {
		const spy = jasmine.createSpy('effect');
		function StateContainer() {
			const [count, setCount] = useState(0);
			useEffect(() => spy());
			return (<div>
				<p>Count: {count}</p>
				<button onClick={() => setCount(c => c + 11)} />
			</div>);
		}

		render(<StateContainer />, scratch);
		expect(scratch.textContent).toEqual(jasmine.arrayContaining(['Count: 0']));
		act(() => {
			const button = scratch.querySelector('button');
			button.click();
			expect(scratch.textContent).toEqual(jasmine.arrayContaining(['Count: 0']));
		});
		expect(scratch.textContent).toEqual(jasmine.arrayContaining(['Count: 1']));
	});

	it('should restore options.requestAnimationFrame', () => {
		const spy = jasmine.createSpy('options.requestAnimationFrame');

		options.requestAnimationFrame = spy;
		act(() => null);

		expect(options.requestAnimationFrame).toBe(spy);
		expect(spy).not.toHaveBeenCalled();
	});

	it('should restore options.debounceRendering', () => {
		const spy = jasmine.createSpy('options.debounceRendering');

		options.debounceRendering = spy;
		act(() => null);

		expect(options.debounceRendering).toBe(spy);
		expect(spy).not.toHaveBeenCalled();
	});

	it('should restore options.debounceRendering when it was undefined before', () => {
		act(() => null);
		expect(options.debounceRendering).toBeUndefined();
	});
});
