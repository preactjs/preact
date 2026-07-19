import { createElement, render, createContext, Component } from 'preact';
import { setupRerender } from 'preact/test-utils';
import { Suspense } from 'preact/compat';
import { use, useState } from 'preact/hooks';
import { setupScratch, teardown } from '../../../test/_util/helpers';

describe('use(promise)', () => {
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

	async function flushPromise(promise) {
		await promise;
		rerender();
		rerender();
	}

	it('suspends while pending and renders the fulfilled value', async () => {
		/** @type {(value: string) => void} */
		let resolve;
		const promise = new Promise(res => {
			resolve = res;
		});

		function Data() {
			return <div>Data: {use(promise)}</div>;
		}

		render(
			<Suspense fallback={<div>Loading</div>}>
				<Data />
			</Suspense>,
			scratch
		);
		rerender();
		expect(scratch.innerHTML).to.equal('<div>Loading</div>');

		resolve('hello');
		await flushPromise(promise);
		expect(scratch.innerHTML).to.equal('<div>Data: hello</div>');
	});

	it('supports falsy fulfilled values', async () => {
		const promise = Promise.resolve(0);

		function Data() {
			return <div>{use(promise)}</div>;
		}

		render(
			<Suspense fallback={<div>Loading</div>}>
				<Data />
			</Suspense>,
			scratch
		);
		rerender();
		expect(scratch.innerHTML).to.equal('<div>Loading</div>');

		await flushPromise(promise);
		expect(scratch.innerHTML).to.equal('<div>0</div>');
	});

	it('renders multiple consumers of the same fulfilled promise', async () => {
		/** @type {(value: string) => void} */
		let resolve;
		const promise = new Promise(res => {
			resolve = res;
		});

		function A() {
			return <div>A: {use(promise)}</div>;
		}

		function B() {
			return <div>B: {use(promise)}</div>;
		}

		render(
			<Suspense fallback={<div>Loading</div>}>
				<A />
				<B />
			</Suspense>,
			scratch
		);
		rerender();
		expect(scratch.innerHTML).to.equal('<div>Loading</div>');

		resolve('x');
		await flushPromise(promise);
		expect(scratch.innerHTML).to.equal('<div>A: x</div><div>B: x</div>');
	});

	it('throws the rejection reason after suspension', async () => {
		/** @type {(error: Error) => void} */
		let reject;
		const promise = new Promise((_res, rej) => {
			reject = rej;
		});

		class ErrorBoundary extends Component {
			state = { error: null };

			componentDidCatch(error) {
				this.setState({ error });
			}

			render(props, state) {
				return state.error ? (
					<div>Caught: {state.error.message}</div>
				) : (
					props.children
				);
			}
		}

		function Data() {
			return <div>Data: {use(promise)}</div>;
		}

		render(
			<ErrorBoundary>
				<Suspense fallback={<div>Loading</div>}>
					<Data />
				</Suspense>
			</ErrorBoundary>,
			scratch
		);
		rerender();
		expect(scratch.innerHTML).to.equal('<div>Loading</div>');

		reject(new Error('boom'));
		await flushPromise(promise.catch(() => {}));
		expect(scratch.innerHTML).to.equal('<div>Caught: boom</div>');
	});

	it('can be called conditionally without shifting hook state', () => {
		const promise =
			/** @type {Promise<string> & { status: string, value: string }} */ (
				Promise.resolve('done')
			);
		promise.status = 'fulfilled';
		promise.value = 'done';
		/** @type {(value: string) => void} */
		let setSecond;

		function App(props) {
			const [first] = useState('first');
			let value = 'skipped';
			if (props.show) value = use(promise);
			const [second, updateSecond] = useState('second');
			setSecond = updateSecond;
			return (
				<div>
					{first}:{value}:{second}
				</div>
			);
		}

		render(<App show={false} />, scratch);
		expect(scratch.innerHTML).to.equal('<div>first:skipped:second</div>');

		setSecond('updated');
		rerender();
		expect(scratch.innerHTML).to.equal('<div>first:skipped:updated</div>');

		render(<App show={true} />, scratch);
		expect(scratch.innerHTML).to.equal('<div>first:done:updated</div>');
	});
});

describe('use(context)', () => {
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

	it('reads the current context value', () => {
		const Context = createContext(13);

		function App() {
			return <div>{use(Context)}</div>;
		}

		render(<App />, scratch);
		expect(scratch.innerHTML).to.equal('<div>13</div>');

		render(
			<Context.Provider value={42}>
				<App />
			</Context.Provider>,
			scratch
		);
		expect(scratch.innerHTML).to.equal('<div>42</div>');
	});

	it('subscribes to provider updates', () => {
		const Context = createContext('a');

		class NoUpdate extends Component {
			shouldComponentUpdate() {
				return false;
			}

			render() {
				return this.props.children;
			}
		}

		function App() {
			return <div>{use(Context)}</div>;
		}

		render(
			<Context.Provider value="a">
				<NoUpdate>
					<App />
				</NoUpdate>
			</Context.Provider>,
			scratch
		);
		expect(scratch.innerHTML).to.equal('<div>a</div>');

		render(
			<Context.Provider value="b">
				<NoUpdate>
					<App />
				</NoUpdate>
			</Context.Provider>,
			scratch
		);
		rerender();
		expect(scratch.innerHTML).to.equal('<div>b</div>');
	});

	it('can be called conditionally without shifting hook state', () => {
		const Context = createContext('context');
		/** @type {(value: string) => void} */
		let setSecond;

		function App(props) {
			const [first] = useState('first');
			const value = props.show ? use(Context) : 'skipped';
			const [second, updateSecond] = useState('second');
			setSecond = updateSecond;
			return (
				<div>
					{first}:{value}:{second}
				</div>
			);
		}

		render(
			<Context.Provider value="provided">
				<App show={false} />
			</Context.Provider>,
			scratch
		);
		expect(scratch.innerHTML).to.equal('<div>first:skipped:second</div>');

		setSecond('updated');
		rerender();
		expect(scratch.innerHTML).to.equal('<div>first:skipped:updated</div>');

		render(
			<Context.Provider value="provided">
				<App show={true} />
			</Context.Provider>,
			scratch
		);
		expect(scratch.innerHTML).to.equal('<div>first:provided:updated</div>');
	});
});
