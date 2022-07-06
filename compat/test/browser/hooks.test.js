import React, {
	createElement,
	useDeferredValue,
	useInsertionEffect,
	useSyncExternalStore,
	useTransition,
	render
} from 'preact/compat';
import { setupRerender, act } from 'preact/test-utils';
import { setupScratch, teardown } from '../../../test/_util/helpers';

describe('React-18-hooks', () => {
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

	describe('useDeferredValue', () => {
		it('returns the value', () => {
			const App = props => {
				const val = useDeferredValue(props.text);
				return <p>{val}</p>;
			};

			render(<App text="hello world" />, scratch);

			expect(scratch.innerHTML).to.equal('<p>hello world</p>');
		});
	});

	describe('useInsertionEffect', () => {
		it('runs the effect', () => {
			const spy = sinon.spy();
			const App = () => {
				useInsertionEffect(spy, []);
				return <p>hello world</p>;
			};

			act(() => {
				render(<App />, scratch);
			});

			expect(scratch.innerHTML).to.equal('<p>hello world</p>');
			expect(spy).to.be.calledOnce;
		});
	});

	describe('useTransition', () => {
		it('runs transitions', () => {
			const spy = sinon.spy();

			let go;
			const App = () => {
				const [isPending, start] = useTransition();
				go = start;
				return <p>Pending: {isPending ? 'yes' : 'no'}</p>;
			};

			render(<App />, scratch);
			expect(scratch.innerHTML).to.equal('<p>Pending: no</p>');

			go(spy);
			rerender();
			expect(spy).to.be.calledOnce;
			expect(scratch.innerHTML).to.equal('<p>Pending: no</p>');
		});
	});

	describe('useSyncExternalStore', () => {
		it('subscribes and follows effects', () => {
			const subscribe = sinon.spy(() => () => {});
			const getSnapshot = sinon.spy(() => 'hello world');

			const App = () => {
				const value = useSyncExternalStore(subscribe, getSnapshot);
				return <p>{value}</p>;
			};

			act(() => {
				render(<App />, scratch);
			});
			expect(scratch.innerHTML).to.equal('<p>hello world</p>');
			expect(subscribe).to.be.calledOnce;
			expect(getSnapshot).to.be.calledOnce;
		});

		it('subscribes and rerenders when called', () => {
			let flush;
			const subscribe = sinon.spy(cb => {
				flush = cb;
				return () => {};
			});
			let called = false;
			const getSnapshot = sinon.spy(() => {
				if (called) {
					return 'hello new world';
				}

				return 'hello world';
			});

			const App = () => {
				const value = useSyncExternalStore(subscribe, getSnapshot);
				return <p>{value}</p>;
			};

			act(() => {
				render(<App />, scratch);
			});
			expect(scratch.innerHTML).to.equal('<p>hello world</p>');
			expect(subscribe).to.be.calledOnce;
			expect(getSnapshot).to.be.calledOnce;

			called = true;
			flush();
			rerender();

			expect(scratch.innerHTML).to.equal('<p>hello new world</p>');
		});
	});
});
