import { setupRerender } from 'preact/test-utils';
import { createElement as h, render } from 'preact';
import { setupScratch, teardown } from '../../../test/_util/helpers';
import { useState } from '../../src';

/** @jsx h */

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

		expect(stateHistory).toEqual([{ a: 1 }, { a: 1 }]);
		expect(stateHistory[0]).toBe(stateHistory[1]);
	});

	it('can initialize the state via a function', () => {
		const initState = jasmine.createSpy('initState').and.callFake(() => { 1; });

		function Comp() {
			useState(initState);
			return null;
		}

		render(<Comp />, scratch);
		render(<Comp />, scratch);

		expect(initState).toHaveBeenCalledTimes(1);
	});

	it('does not rerender on equal state', () => {
		let lastState;

		/** @type {(arg: number | ((prev: number) => number)) => void} */
		let doSetState;

		const Comp = jasmine.createSpy('Comp').and.callFake(() => {
			const [state, setState] = useState(0);
			lastState = state;
			doSetState = setState;
			return null;
		});

		render(<Comp />, scratch);
		expect(lastState).toBe(0);
		expect(Comp).toHaveBeenCalledTimes(1);

		doSetState(0);
		rerender();
		expect(lastState).toBe(0);
		expect(Comp).toHaveBeenCalledTimes(1);

		doSetState(() => 0);
		rerender();
		expect(lastState).toBe(0);
		expect(Comp).toHaveBeenCalledTimes(1);
	});

	it('rerenders when setting the state', () => {
		let lastState;

		/** @type {(arg: number | ((prev: number) => number)) => void} */
		let doSetState;

		const Comp = jasmine.createSpy('Comp').and.callFake(() => {
			const [state, setState] = useState(0);
			lastState = state;
			doSetState = setState;
			return null;
		});

		render(<Comp />, scratch);
		expect(lastState).toBe(0);
		expect(Comp).toHaveBeenCalledTimes(1);

		doSetState(1);
		rerender();
		expect(lastState).toBe(1);
		expect(Comp).toHaveBeenCalledTimes(2);

		// Updater function style
		doSetState(current => current * 10);
		rerender();
		expect(lastState).toBe(10);
		expect(Comp).toHaveBeenCalledTimes(3);
	});

	it('can be set by another component', () => {
		function StateContainer() {
			const [count, setCount] = useState(0);
			return (<div>
				<p>Count: {count}</p>
				<Increment increment={() => setCount(c => c + 10)} />
			</div>);
		}

		function Increment(props) {
			return <button onClick={props.increment}>Increment</button>;
		}

		render(<StateContainer />, scratch);
		expect(scratch.textContent).toEqual(jasmine.arrayContaining(['Count: 0']));

		const button = scratch.querySelector('button');
		button.click();

		rerender();
		expect(scratch.textContent).toEqual(jasmine.arrayContaining(['Count: 10']));
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
		expect(scratch.textContent).toBe('Click Here!!');
		const text = scratch.querySelector('p');
		text.click();
		rerender();
		expect(scratch.innerHTML).toBe('');
	});
});
