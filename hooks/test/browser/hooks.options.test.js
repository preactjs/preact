import {
	afterDiffSpy,
	beforeRenderSpy,
	unmountSpy,
	hookSpy
} from '../../../test/_util/optionSpies';

import { setupRerender, act } from 'preact/test-utils';
import { createElement, render, createContext, options } from 'preact';
import { setupScratch, teardown } from '../../../test/_util/helpers';
import {
	useState,
	useReducer,
	useEffect,
	useLayoutEffect,
	useRef,
	useImperativeHandle,
	useMemo,
	useCallback,
	useContext,
	useErrorBoundary
} from 'preact/hooks';

/** @jsx createElement */

describe('hook options', () => {
	/** @type {HTMLDivElement} */
	let scratch;

	/** @type {() => void} */
	let rerender;

	/** @type {() => void} */
	let increment;

	beforeEach(() => {
		scratch = setupScratch();
		rerender = setupRerender();

		afterDiffSpy.resetHistory();
		unmountSpy.resetHistory();
		beforeRenderSpy.resetHistory();
		hookSpy.resetHistory();
	});

	afterEach(() => {
		teardown(scratch);
	});

	function App() {
		const [count, setCount] = useState(0);
		increment = () => setCount(prevCount => prevCount + 1);
		return <div>{count}</div>;
	}

	it('should call old options on mount', () => {
		render(<App />, scratch);

		expect(beforeRenderSpy).to.have.been.called;
		expect(afterDiffSpy).to.have.been.called;
	});

	it('should call old options.diffed on update', () => {
		render(<App />, scratch);

		increment();
		rerender();

		expect(beforeRenderSpy).to.have.been.called;
		expect(afterDiffSpy).to.have.been.called;
	});

	it('should call old options on unmount', () => {
		render(<App />, scratch);
		render(null, scratch);

		expect(unmountSpy).to.have.been.called;
	});

	it('should detect hooks', () => {
		const USE_STATE = 1;
		const USE_REDUCER = 2;
		const USE_EFFECT = 3;
		const USE_LAYOUT_EFFECT = 4;
		const USE_REF = 5;
		const USE_IMPERATIVE_HANDLE = 6;
		const USE_MEMO = 7;
		const USE_CALLBACK = 8;
		const USE_CONTEXT = 9;
		const USE_ERROR_BOUNDARY = 10;

		const Ctx = createContext(null);

		function App() {
			useState(0);
			useReducer(x => x, 0);
			useEffect(() => null, []);
			useLayoutEffect(() => null, []);
			const ref = useRef(null);
			useImperativeHandle(ref, () => null);
			useMemo(() => null, []);
			useCallback(() => null, []);
			useContext(Ctx);
			useErrorBoundary(() => null);
		}

		render(
			<Ctx.Provider value="a">
				<App />
			</Ctx.Provider>,
			scratch
		);

		expect(hookSpy.args.map(arg => [arg[1], arg[2]])).to.deep.equal([
			[0, USE_STATE],
			[1, USE_REDUCER],
			[2, USE_EFFECT],
			[3, USE_LAYOUT_EFFECT],
			[4, USE_REF],
			[5, USE_IMPERATIVE_HANDLE],
			[6, USE_MEMO],
			[7, USE_CALLBACK],
			[8, USE_CONTEXT],
			[9, USE_ERROR_BOUNDARY],
			// Belongs to useErrorBoundary that uses multiple native hooks.
			[10, USE_STATE]
		]);
	});

	describe('Effects', () => {
		beforeEach(() => {
			options._skipEffects = options.__s = true;
		});

		afterEach(() => {
			options._skipEffects = options.__s = false;
		});

		it('should skip effect hooks', () => {
			const spy = sinon.spy();
			function App() {
				useEffect(spy, []);
				useLayoutEffect(spy, []);
				return null;
			}

			act(() => {
				render(<App />, scratch);
			});

			expect(spy.callCount).to.equal(0);
		});
	});
});
