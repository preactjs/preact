import { setupRerender } from 'preact/test-utils';
import { createElement as h, render } from 'preact';
import { setupScratch, teardown } from '../../../test/_util/helpers';
import { createComponent, ref, unwrap, isReactive } from '../../src';

/** @jsx h */

describe('ref', () => {

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
			const state = ref({ a: 1 });

			return () => {
				stateHistory.push(state.value);
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
		let stateRef;

		const Comp = createComponent(() => {
			stateRef = ref(0);
			return (renderSpy = sinon.spy(() => null));
		});

		render(<Comp />, scratch);
		expect(stateRef.value).to.equal(0);
		expect(renderSpy).to.be.calledOnce;

		stateRef.value = 0;
		rerender();
		expect(stateRef.value).to.equal(0);
		expect(renderSpy).to.be.calledOnce;
	});

	it('rerenders when setting the state', () => {
		let renderSpy;
		let stateRef;

		const Comp = createComponent(() => {
			stateRef = ref(0);
			return (renderSpy = sinon.spy(() => null));
		});

		render(<Comp />, scratch);
		expect(stateRef.value).to.equal(0);
		expect(renderSpy).to.be.calledOnce;

		stateRef.value = 1;
		rerender();
		expect(stateRef.value).to.equal(1);
		expect(renderSpy).to.be.calledTwice;
	});

	it('can be set by another component', () => {
		const StateContainer = createComponent(() => {
			const count = ref(0);
			const increment = () => (count.value += 10);
			return () => (
				<div>
					<p>Count: {count.value}</p>
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

	it('should handle queued useState', () => {
		// this is a very bad example just for the sake to have same test as hooks
		// it should use `watch`
		const Message = createComponent(props => {
			const visibleRef = ref(Boolean(props.message));
			const messageRef = ref(props.message);

			const setPrevMessage = message => (messageRef.value = message);
			const setVisible = visible => (visibleRef.value = visible);

			return ({ message, onClose }) => {
				if (message !== messageRef.value) {
					setPrevMessage(message);
					setVisible(Boolean(message));
				}

				if (!visibleRef.value) return null;

				return <p onClick={onClose}>{message}</p>;
			};
		});

		const App = createComponent(() => {
			const message = ref('Click Here!!');
			const setMessage = () => (message.value = '');
			return () => <Message onClose={setMessage} message={message.value} />;
		});

		render(<App />, scratch);
		expect(scratch.textContent).to.equal('Click Here!!');
		const text = scratch.querySelector('p');
		text.click();
		rerender();
		expect(scratch.innerHTML).to.equal('');
	});

	it('unwrap and check reactivity', () => {
		const Comp = createComponent(() => {
			const state = ref({ a: 1 });

			expect(unwrap(state)).to.deep.equal({ a: 1 });
			expect(unwrap(state)).to.deep.equal(state.value);
			expect(isReactive(state)).to.be.true;
			expect(isReactive(state.value)).to.be.false;
			expect(isReactive(null)).to.be.false;
			expect(isReactive(false)).to.be.false;

			return () => null;
		});

		render(<Comp />, scratch);
	});
});
