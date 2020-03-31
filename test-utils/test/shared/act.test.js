import { options, createElement, render } from 'preact';
import { useEffect, useReducer, useState } from 'preact/hooks';
import { act } from 'preact/test-utils';
import { setupScratch, teardown } from '../../../test/_util/helpers';

/** @jsx createElement */

// IE11 doesn't support `new Event()`
function createEvent(name) {
	if (typeof Event == 'function') return new Event(name);

	const event = document.createEvent('Event');
	event.initEvent(name, true, true);
	return event;
}

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
				if (count === 1) {
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
			return (
				<div>
					<p>Count: {count}</p>
					<button onClick={() => setCount(c => c + 11)} />
				</div>
			);
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
		button.dispatchEvent(createEvent('click'));

		expect(button.textContent).to.equal('0');

		act(() => {
			// Click button a second time. This will schedule a second update.
			button.dispatchEvent(createEvent('click'));
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

	context('when `act` calls are nested', () => {
		it('should invoke nested sync callback and return a Promise', () => {
			let innerResult;
			const spy = sinon.stub();

			act(() => {
				innerResult = act(spy);
			});

			expect(spy).to.be.calledOnce;
			expect(innerResult.then).to.be.a('function');
		});

		it('should invoke nested async callback and return a Promise', async () => {
			const events = [];

			await act(async () => {
				events.push('began outer act callback');
				await act(async () => {
					events.push('began inner act callback');
					await Promise.resolve();
					events.push('end inner act callback');
				});
				events.push('end outer act callback');
			});
			events.push('act finished');

			expect(events).to.deep.equal([
				'began outer act callback',
				'began inner act callback',
				'end inner act callback',
				'end outer act callback',
				'act finished'
			]);
		});

		it('should only flush effects when outer `act` call returns', () => {
			let counter = 0;

			function Widget() {
				useEffect(() => {
					++counter;
				});
				const [, forceUpdate] = useReducer(x => x + 1, 0);
				return <button onClick={forceUpdate}>test</button>;
			}

			act(() => {
				render(<Widget />, scratch);
				const button = scratch.querySelector('button');
				expect(counter).to.equal(0);

				act(() => {
					button.dispatchEvent(createEvent('click'));
				});

				// Effect triggered by inner `act` call should not have been
				// flushed yet.
				expect(counter).to.equal(0);
			});

			// Effects triggered by inner `act` call should now have been
			// flushed.
			expect(counter).to.equal(2);
		});

		it('should only flush updates when outer `act` call returns', () => {
			function Button() {
				const [count, setCount] = useState(0);
				const increment = () => setCount(count => count + 1);
				return <button onClick={increment}>{count}</button>;
			}

			render(<Button />, scratch);
			const button = scratch.querySelector('button');
			expect(button.textContent).to.equal('0');

			act(() => {
				act(() => {
					button.dispatchEvent(createEvent('click'));
				});

				// Update triggered by inner `act` call should not have been
				// flushed yet.
				expect(button.textContent).to.equal('0');
			});

			// Updates from outer and inner `act` calls should now have been
			// flushed.
			expect(button.textContent).to.equal('1');
		});
	});

	describe('when `act` callback throws an exception', () => {
		function BrokenWidget() {
			throw new Error('BrokenWidget is broken');
		}

		let effectCount;

		function WorkingWidget() {
			const [count, setCount] = useState(0);

			useEffect(() => {
				++effectCount;
			}, []);

			if (count === 0) {
				setCount(1);
			}

			return <div>{count}</div>;
		}

		beforeEach(() => {
			effectCount = 0;
		});

		const renderBroken = () => {
			act(() => {
				render(<BrokenWidget />, scratch);
			});
		};

		const renderWorking = () => {
			act(() => {
				render(<WorkingWidget />, scratch);
			});
		};

		const tryRenderBroken = () => {
			try {
				renderBroken();
			} catch (e) {}
		};

		describe('synchronously', () => {
			it('should rethrow the exception', () => {
				expect(renderBroken).to.throw('BrokenWidget is broken');
			});

			it('should not affect state updates in future renders', () => {
				tryRenderBroken();
				renderWorking();
				expect(scratch.textContent).to.equal('1');
			});

			it('should not affect effects in future renders', () => {
				tryRenderBroken();
				renderWorking();
				expect(effectCount).to.equal(1);
			});
		});

		describe('asynchronously', () => {
			const renderBrokenAsync = async () => {
				await act(async () => {
					render(<BrokenWidget />, scratch);
				});
			};

			it('should rethrow the exception', async () => {
				let err;
				try {
					await renderBrokenAsync();
				} catch (e) {
					err = e;
				}
				expect(err.message).to.equal('BrokenWidget is broken');
			});

			it('should not affect state updates in future renders', async () => {
				try {
					await renderBrokenAsync();
				} catch (e) {}

				renderWorking();
				expect(scratch.textContent).to.equal('1');
			});

			it('should not affect effects in future renders', async () => {
				try {
					await renderBrokenAsync();
				} catch (e) {}

				renderWorking();
				expect(effectCount).to.equal(1);
			});
		});

		describe('in an effect', () => {
			function BrokenEffect() {
				useEffect(() => {
					throw new Error('BrokenEffect effect');
				}, []);
				return null;
			}

			const renderBrokenEffect = () => {
				act(() => {
					render(<BrokenEffect />, scratch);
				});
			};

			it('should rethrow the exception', () => {
				expect(renderBrokenEffect).to.throw('BrokenEffect effect');
			});

			it('should not affect state updates in future renders', () => {
				try {
					renderBrokenEffect();
				} catch (e) {}

				renderWorking();
				expect(scratch.textContent).to.equal('1');
			});

			it('should not affect effects in future renders', () => {
				try {
					renderBrokenEffect();
				} catch (e) {}

				renderWorking();
				expect(effectCount).to.equal(1);
			});
		});
	});
});
