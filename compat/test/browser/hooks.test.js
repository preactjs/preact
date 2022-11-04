import React, {
	createElement,
	useDeferredValue,
	useInsertionEffect,
	useSyncExternalStore,
	useTransition,
	render,
	useState,
	useCallback
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
			expect(getSnapshot).to.be.calledThrice;
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
			expect(getSnapshot).to.be.calledThrice;

			called = true;
			flush();
			rerender();

			expect(scratch.innerHTML).to.equal('<p>hello new world</p>');
		});

		it('getSnapshot can return NaN without causing infinite loop', () => {
			let flush;
			const subscribe = sinon.spy(cb => {
				flush = cb;
				return () => {};
			});
			let called = false;
			const getSnapshot = sinon.spy(() => {
				if (called) {
					return NaN;
				}

				return 1;
			});

			const App = () => {
				const value = useSyncExternalStore(subscribe, getSnapshot);
				return <p>{value}</p>;
			};

			act(() => {
				render(<App />, scratch);
			});
			expect(scratch.innerHTML).to.equal('<p>1</p>');
			expect(subscribe).to.be.calledOnce;
			expect(getSnapshot).to.be.calledThrice;

			called = true;
			flush();
			rerender();

			expect(scratch.innerHTML).to.equal('<p>NaN</p>');
		});

		it('should not call function values on subscription', () => {
			let flush;
			const subscribe = sinon.spy(cb => {
				flush = cb;
				return () => {};
			});

			const func = () => 'value: ' + i++;

			let i = 0;
			const getSnapshot = sinon.spy(() => {
				return func;
			});

			const App = () => {
				const value = useSyncExternalStore(subscribe, getSnapshot);
				return <p>{value()}</p>;
			};

			act(() => {
				render(<App />, scratch);
			});
			expect(scratch.innerHTML).to.equal('<p>value: 0</p>');
			expect(subscribe).to.be.calledOnce;
			expect(getSnapshot).to.be.calledThrice;

			flush();
			rerender();

			expect(scratch.innerHTML).to.equal('<p>value: 0</p>');
		});

		it('should work with changing getSnapshot', () => {
			let flush;
			const subscribe = sinon.spy(cb => {
				flush = cb;
				return () => {};
			});

			let i = 0;
			const App = () => {
				const value = useSyncExternalStore(subscribe, () => {
					return i;
				});
				return <p>value: {value}</p>;
			};

			act(() => {
				render(<App />, scratch);
			});
			expect(scratch.innerHTML).to.equal('<p>value: 0</p>');
			expect(subscribe).to.be.calledOnce;

			i++;
			flush();
			rerender();

			expect(scratch.innerHTML).to.equal('<p>value: 1</p>');
		});

		it('works with useCallback', () => {
			let toggle;
			const App = () => {
				const [state, setState] = useState(true);
				toggle = setState.bind(this, () => false);

				const value = useSyncExternalStore(
					useCallback(() => {
						return () => {};
					}, [state]),
					() => (state ? 'yep' : 'nope')
				);

				return <p>{value}</p>;
			};

			act(() => {
				render(<App />, scratch);
			});
			expect(scratch.innerHTML).to.equal('<p>yep</p>');

			toggle();
			rerender();

			expect(scratch.innerHTML).to.equal('<p>nope</p>');
		});
	});
});
