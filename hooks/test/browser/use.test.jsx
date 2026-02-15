import { setupScratch, teardown } from '../../../test/_util/helpers';
import { setupRerender } from 'preact/test-utils';
import { createElement, render, createContext } from 'preact';
import { Suspense } from 'preact/compat';
import { use, useErrorBoundary } from 'preact/hooks';

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

	it('suspends on pending and renders fallback, then shows resolved data', async () => {
		/** @type {(v: string) => void} */
		let resolve;
		const p = new Promise((res, _rej) => {
			resolve = v => res(v);
		});

		function Data() {
			const val = use(p);
			return <div>Data: {val}</div>;
		}

		render(
			<Suspense fallback={<div>Loading</div>}>
				<Data />
			</Suspense>,
			scratch
		);
		// Initial render followed by rerender to reflect fallback during suspension
		rerender();
		expect(scratch.innerHTML).to.equal('<div>Loading</div>');

		resolve('hello');
		await p;
		rerender();
		expect(scratch.innerHTML).to.equal('<div>Data: hello</div>');
	});

	it('renders two components using same promise and updates both on resolve', async () => {
		/** @type {(v: string) => void} */
		let resolve;
		const p = new Promise((res, _rej) => {
			resolve = v => res(v);
		});

		function A() {
			const val = use(p);
			return <div>A: {val}</div>;
		}
		function B() {
			const val = use(p);
			return <div>B: {val}</div>;
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
		await p;
		rerender();
		expect(scratch.innerHTML).to.equal('<div>A: x</div><div>B: x</div>');
	});

	it('propagates rejection to error boundary after suspension', async () => {
		/** @type {() => void} */
		let reject;
		const p = new Promise((res, rej) => {
			reject = () => rej(new Error('boom'));
		});
		p.catch(() => {});

		function Catcher(props) {
			const [err] = useErrorBoundary();
			return err ? <div>Caught: {err.message}</div> : props.children;
		}

		function Data() {
			const val = use(p);
			return <div>Data: {val}</div>;
		}

		render(
			<Suspense fallback={<div>Loading</div>}>
				<Catcher>
					<Data />
				</Catcher>
			</Suspense>,
			scratch
		);

		await new Promise(resolve => setTimeout(resolve, 0));
		rerender();
		expect(scratch.innerHTML).to.equal('<div>Loading</div>');

		reject();

		await new Promise(resolve => setTimeout(resolve, 0));
		rerender();

		expect(scratch.innerHTML).to.equal('<div>Caught: boom</div>');
	});
});

describe('use(context)', () => {
	/** @type {HTMLDivElement} */
	let scratch;

	beforeEach(() => {
		scratch = setupScratch();
	});

	afterEach(() => {
		teardown(scratch);
	});

	it('gets values from context via use(Context)', () => {
		const values = [];
		const Ctx = createContext(13);

		function Comp() {
			const value = use(Ctx);
			values.push(value);
			return null;
		}

		render(<Comp />, scratch);
		render(
			<Ctx.Provider value={42}>
				<Comp />
			</Ctx.Provider>,
			scratch
		);
		render(
			<Ctx.Provider value={69}>
				<Comp />
			</Ctx.Provider>,
			scratch
		);

		expect(values).to.deep.equal([13, 42, 69]);
	});

	it('uses default value when no provider is present', () => {
		const Foo = createContext(42);
		let read;

		function App() {
			read = use(Foo);
			return <div />;
		}

		render(<App />, scratch);
		expect(read).to.equal(42);
	});

	it('supports multiple contexts via use(Context)', () => {
		const Foo = createContext(0);
		const Bar = createContext(10);
		/** @type {Array<[number, number]>} */
		const reads = [];

		function Comp() {
			const foo = use(Foo);
			const bar = use(Bar);
			reads.push([foo, bar]);
			return <div />;
		}

		render(
			<Foo.Provider value={0}>
				<Bar.Provider value={10}>
					<Comp />
				</Bar.Provider>
			</Foo.Provider>,
			scratch
		);
		expect(reads).to.deep.equal([[0, 10]]);

		render(
			<Foo.Provider value={11}>
				<Bar.Provider value={42}>
					<Comp />
				</Bar.Provider>
			</Foo.Provider>,
			scratch
		);
		expect(reads).to.deep.equal([
			[0, 10],
			[11, 42]
		]);
	});
});
