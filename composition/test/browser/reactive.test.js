/* eslint-disable react/display-name */
import { setupRerender } from 'preact/test-utils';
import { createElement, render } from 'preact';
import { setupScratch, teardown } from '../../../test/_util/helpers';
import { createComponent, reactive, isReactive, unwrap } from '../../src';

/** @jsx createElement */

describe('reactive', () => {
	/** @type {HTMLDivElement} */
	let scratch;

	/** @type {() => void} */
	let rerender;

	beforeEach(() => {
		scratch = setupScratch();
		rerender = setupRerender();
	});

	afterEach(() => {
		teardown(scratch);
	});

	it('serves the same state across render calls', () => {
		const stateHistory = [];

		const Comp = createComponent(() => {
			const state = reactive({ a: 1 });

			return () => {
				// use the immutable $value
				stateHistory.push(state.$value);
				return null;
			};
		});

		render(<Comp />, scratch);
		render(<Comp />, scratch);

		expect(stateHistory).to.deep.equal([{ a: 1 }, { a: 1 }]);
		expect(stateHistory[0]).to.equal(stateHistory[1]);
	});

	it('does not rerender on equal state', () => {
		let renderSpy;
		let state;

		const Comp = createComponent(() => {
			state = reactive({ count: 0 });
			return (renderSpy = sinon.spy(() => null));
		});

		render(<Comp />, scratch);
		expect(state.count).to.equal(0);
		expect(renderSpy).to.be.calledOnce;

		state.count = 0;
		rerender();
		expect(state.count).to.equal(0);
		expect(renderSpy).to.be.calledOnce;
	});

	it('rerenders when setting the state', () => {
		let renderSpy;
		let state;

		const Comp = createComponent(() => {
			state = reactive({ count: 0 });
			return (renderSpy = sinon.spy(() => null));
		});

		render(<Comp />, scratch);
		expect(state.count).to.equal(0);
		expect(renderSpy).to.be.calledOnce;

		state.count = 1;
		rerender();
		expect(state.count).to.equal(1);
		expect(renderSpy).to.be.calledTwice;
	});

	it('can be set by another component', () => {
		const StateContainer = createComponent(() => {
			const state = reactive({ count: 0 });
			const increment = () => (state.count += 10);
			return () => (
				<div>
					<p>Count: {state.count}</p>
					<Increment increment={increment} />
				</div>
			);
		});

		function Increment(props) {
			return <button onClick={props.increment}>Increment</button>;
		}

		render(<StateContainer />, scratch);
		expect(scratch.textContent).to.include('Count: 0');

		const button = scratch.querySelector('button');
		button.click();

		rerender();
		expect(scratch.textContent).to.include('Count: 10');
	});

	it('should handle queued reactive set', () => {
		// this is a very bad example just for the sake to have same test as hooks
		// it should use `watch`
		const Message = createComponent(props => {
			const state1 = reactive({ visible: Boolean(props.message) });
			const state2 = reactive({ message: props.message });

			const setPrevMessage = message => (state2.message = message);
			const setVisible = visible => (state1.visible = visible);

			return ({ message, onClose }) => {
				if (message !== state2.message) {
					setPrevMessage(message);
					setVisible(Boolean(message));
				}

				if (!state1.visible) return null;

				return <p onClick={onClose}>{message}</p>;
			};
		});

		const App = createComponent(() => {
			const state = reactive({ message: 'Click Here!!' });
			const setMessage = () => (state.message = '');
			return () => <Message onClose={setMessage} message={state.message} />;
		});

		render(<App />, scratch);
		expect(scratch.textContent).to.equal('Click Here!!');
		const text = scratch.querySelector('p');
		text.click();
		rerender();
		expect(scratch.innerHTML).to.equal('');
	});

	it('can be converted to json or spread', () => {
		const Comp = createComponent(() => {
			const state = reactive({ a: 1 });

			expect(state).to.deep.equal({ a: 1 });
			expect(state).to.deep.equal(state.$value);

			expect(Object.assign({}, state)).to.deep.equal({ a: 1 });

			expect(JSON.stringify(state)).to.equal('{"a":1}');

			expect(Object.keys(state)).to.deep.equal(['a']);

			return () => null;
		});

		render(<Comp />, scratch);
	});

	it('unwrap and check reactivity', () => {
		const Comp = createComponent(() => {
			const state = reactive({ a: 1 });

			expect(unwrap(state)).to.deep.equal({ a: 1 });
			expect(unwrap(state)).to.deep.equal(state.$value);
			expect(unwrap('str')).to.equal('str');
			expect(unwrap(null)).to.equal(null);
			expect(unwrap(false)).to.equal(false);
			expect(unwrap(undefined)).to.equal(undefined);
			expect(isReactive(state)).to.be.true;
			expect(isReactive(state.$value)).to.be.false;
			expect(isReactive(null)).to.be.false;
			expect(isReactive(false)).to.be.false;

			return () => null;
		});

		render(<Comp />, scratch);
	});

	it('check, get and set a property', () => {
		const Comp = createComponent(() => {
			const state = reactive({ a: 1 });

			expect(state.a).to.equal(1);
			state.a = 2;
			expect(state.a).to.equal(2);
			state.$value = { a: 3 };
			expect(state.a).to.equal(3);
			expect('a' in state).to.be.true;

			return () => null;
		});

		render(<Comp />, scratch);
	});
});
