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

	it('should flush series of hooks', () => {
		const spy = sinon.spy();
		const spy2 = sinon.spy();
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
		expect(spy).to.be.calledOnce;
		expect(scratch.textContent).to.include('Count: 0');
		act(() => {
			const button = scratch.querySelector('button');
			button.click();
		});
		expect(spy.callCount).to.equal(5);
		expect(spy2).to.be.calledOnce;
		expect(scratch.textContent).to.include('Count: 3');
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

	it('should restore options.debounceRendering', () => {
		const spy = sinon.spy();

		options.debounceRendering = spy;
		act(() => null);

		expect(options.debounceRendering).to.equal(spy);
		expect(spy).to.not.be.called;
	});

	it('should restore options.debounceRendering when it was undefined before', () => {
		act(() => null);
		expect(options.debounceRendering).to.equal(undefined);
	});

	it('should flush state updates if there are pending state updates before `act` call', () => {
		function CounterButton() {
			const [count, setCount] = useState(0);
			const increment = () => setCount(count => count + 1);
			return <button onClick={increment}>{count}</button>;
		}

		render(<CounterButton />, scratch);
		const button = scratch.querySelector('button');

		// Click button. This will schedule an update which is deferred, as is
		// normal for Preact, since it happens outside an `act` call.
		button.dispatchEvent(new Event('click'));

		expect(button.textContent).to.equal('0');

		act(() => {
			// Click button a second time. This will schedule a second update.
			button.dispatchEvent(new Event('click'));
		});
		// All state updates should be applied synchronously after the `act`
		// callback has run but before `act` returns.
		expect(button.textContent).to.equal('2');
	});

	it('should flush effects if there are pending effects before `act` call', () => {
		function Counter() {
			const [count, setCount] = useState(0);
			useEffect(() => {
				setCount(count => count + 1);
			}, []);
			return <div>{count}</div>;
		}

		// Render a component which schedules an effect outside of an `act`
		// call. This will be scheduled to execute after the next paint as usual.
		render(<Counter />, scratch);
		expect(scratch.firstChild.textContent).to.equal('0');

		// Render a component inside an `act` call, this effect should be
		// executed synchronously before `act` returns.
		act(() => {
			render(<div />, scratch);
			render(<Counter />, scratch);
		});
		expect(scratch.firstChild.textContent).to.equal('1');
	});

	it('returns a Promise if invoked with a sync callback', () => {
		const result = act(() => {});
		expect(result.then).to.be.a('function');
		return result;
	});

	it('returns a Promise if invoked with an async callback', () => {
		const result = act(async () => {});
		expect(result.then).to.be.a('function');
		return result;
	});

	it('should await "thenable" result of callback before flushing', async () => {
		const events = [];

		function TestComponent() {
			useEffect(() => {
				events.push('flushed effect');
			}, []);
			events.push('scheduled effect');
			return <div>Test</div>;
		}

		const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

		events.push('began test');
		const acted = act(async () => {
			events.push('began act callback');
			await delay(1);
			render(<TestComponent />, scratch);
			events.push('end act callback');
		});
		events.push('act returned');
		await acted;
		events.push('act result resolved');

		expect(events).to.deep.equal([
			'began test',
			'began act callback',
			'act returned',
			'scheduled effect',
			'end act callback',
			'flushed effect',
			'act result resolved'
		]);
	});
});
