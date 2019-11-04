import { setupRerender } from 'preact/test-utils';
import { createElement, render } from 'preact';
import { setupScratch, teardown } from '../../../test/_util/helpers';
import { useState } from 'preact/hooks';

/** @jsx createElement */

describe('useState', () => {
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

		function Comp() {
			const [state] = useState({ a: 1 });
			stateHistory.push(state);
			return null;
		}

		render(<Comp />, scratch);
		render(<Comp />, scratch);

		expect(stateHistory).to.deep.equal([{ a: 1 }, { a: 1 }]);
		expect(stateHistory[0]).to.equal(stateHistory[1]);
	});

	it('can initialize the state via a function', () => {
		const initState = sinon.spy(() => 1);

		function Comp() {
			useState(initState);
			return null;
		}

		render(<Comp />, scratch);
		render(<Comp />, scratch);

		expect(initState).to.be.calledOnce;
	});

	it('does not rerender on equal state', () => {
		let lastState;
		let doSetState;

		const Comp = sinon.spy(() => {
			const [state, setState] = useState(0);
			lastState = state;
			doSetState = setState;
			return null;
		});

		render(<Comp />, scratch);
		expect(lastState).to.equal(0);
		expect(Comp).to.be.calledOnce;

		doSetState(0);
		rerender();
		expect(lastState).to.equal(0);
		expect(Comp).to.be.calledOnce;

		doSetState(() => 0);
		rerender();
		expect(lastState).to.equal(0);
		expect(Comp).to.be.calledOnce;
	});

	it('rerenders when setting the state', () => {
		let lastState;
		let doSetState;

		const Comp = sinon.spy(() => {
			const [state, setState] = useState(0);
			lastState = state;
			doSetState = setState;
			return null;
		});

		render(<Comp />, scratch);
		expect(lastState).to.equal(0);
		expect(Comp).to.be.calledOnce;

		doSetState(1);
		rerender();
		expect(lastState).to.equal(1);
		expect(Comp).to.be.calledTwice;

		// Updater function style
		doSetState(current => current * 10);
		rerender();
		expect(lastState).to.equal(10);
		expect(Comp).to.be.calledThrice;
	});

	it('can be set by another component', () => {
		function StateContainer() {
			const [count, setCount] = useState(0);
			return (
				<div>
					<p>Count: {count}</p>
					<Increment increment={() => setCount(c => c + 10)} />
				</div>
			);
		}

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

	it('should correctly initialize', () => {
		let scopedThing = 'hi';
		let arg;

		function useSomething() {
			const args = useState(setup);
			function setup(thing = scopedThing) {
				arg = thing;
				return thing;
			}
			return args;
		}

		const App = () => {
			const [state] = useSomething();
			return <p>{state}</p>;
		};

		render(<App />, scratch);

		expect(arg).to.equal('hi');
		expect(scratch.innerHTML).to.equal('<p>hi</p>');
	});

	it('should handle queued useState', () => {
		function Message({ message, onClose }) {
			const [isVisible, setVisible] = useState(Boolean(message));
			const [prevMessage, setPrevMessage] = useState(message);

			if (message !== prevMessage) {
				setPrevMessage(message);
				setVisible(Boolean(message));
			}

			if (!isVisible) {
				return null;
			}
			return <p onClick={onClose}>{message}</p>;
		}

		function App() {
			const [message, setMessage] = useState('Click Here!!');
			return (
				<Message
					onClose={() => {
						setMessage('');
					}}
					message={message}
				/>
			);
		}

		render(<App />, scratch);
		expect(scratch.textContent).to.equal('Click Here!!');
		const text = scratch.querySelector('p');
		text.click();
		rerender();
		expect(scratch.innerHTML).to.equal('');
	});
});
