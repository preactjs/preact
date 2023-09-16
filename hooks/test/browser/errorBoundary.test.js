import { createElement, render } from 'preact';
import { setupScratch, teardown } from '../../../test/_util/helpers';
import { useErrorBoundary, useLayoutEffect } from 'preact/hooks';
import { setupRerender } from 'preact/test-utils';

/** @jsx createElement */

describe('errorBoundary', () => {
	/** @type {HTMLDivElement} */
	let scratch, rerender;

	beforeEach(() => {
		scratch = setupScratch();
		rerender = setupRerender();
	});

	afterEach(() => {
		teardown(scratch);
	});

	it('catches errors', () => {
		let resetErr,
			success = false;
		const Throws = () => {
			throw new Error('test');
		};

		const App = props => {
			const [err, reset] = useErrorBoundary();
			resetErr = reset;
			return err ? <p>Error</p> : success ? <p>Success</p> : <Throws />;
		};

		render(<App />, scratch);
		rerender();
		expect(scratch.innerHTML).to.equal('<p>Error</p>');

		success = true;
		resetErr();
		rerender();
		expect(scratch.innerHTML).to.equal('<p>Success</p>');
	});

	it('calls the errorBoundary callback', () => {
		const spy = sinon.spy();
		const error = new Error('test');
		const Throws = () => {
			throw error;
		};

		const App = props => {
			const [err] = useErrorBoundary(spy);
			return err ? <p>Error</p> : <Throws />;
		};

		render(<App />, scratch);
		rerender();
		expect(scratch.innerHTML).to.equal('<p>Error</p>');
		expect(spy).to.be.calledOnce;
		expect(spy).to.be.calledWith(error, {});
	});

	it('returns error', () => {
		const error = new Error('test');
		const Throws = () => {
			throw error;
		};

		let returned;
		const App = () => {
			const [err] = useErrorBoundary();
			returned = err;
			return err ? <p>Error</p> : <Throws />;
		};

		render(<App />, scratch);
		rerender();
		expect(returned).to.equal(error);
	});

	it('does not leave a stale closure', () => {
		const spy = sinon.spy(),
			spy2 = sinon.spy();
		let resetErr;
		const error = new Error('test');
		const Throws = () => {
			throw error;
		};

		const App = props => {
			const [err, reset] = useErrorBoundary(props.onError);
			resetErr = reset;
			return err ? <p>Error</p> : <Throws />;
		};

		render(<App onError={spy} />, scratch);
		rerender();
		expect(scratch.innerHTML).to.equal('<p>Error</p>');
		expect(spy).to.be.calledOnce;
		expect(spy).to.be.calledWith(error);

		resetErr();
		render(<App onError={spy2} />, scratch);
		rerender();
		expect(spy).to.be.calledOnce;
		expect(spy2).to.be.calledOnce;
		expect(spy2).to.be.calledWith(error);
		expect(scratch.innerHTML).to.equal('<p>Error</p>');
	});

	it('does not invoke old effects when a cleanup callback throws an error and is handled', () => {
		let throwErr = false;
		let thrower = sinon.spy(() => {
			if (throwErr) {
				throw new Error('test');
			}
		});
		let badEffect = sinon.spy(() => thrower);
		let goodEffect = sinon.spy();

		function EffectThrowsError() {
			useLayoutEffect(badEffect);
			return <span>Test</span>;
		}

		function Child({ children }) {
			useLayoutEffect(goodEffect);
			return children;
		}

		function App() {
			const [err] = useErrorBoundary();
			return err ? (
				<p>Error</p>
			) : (
				<Child>
					<EffectThrowsError />
				</Child>
			);
		}

		render(<App />, scratch);
		expect(scratch.innerHTML).to.equal('<span>Test</span>');
		expect(badEffect).to.be.calledOnce;
		expect(goodEffect).to.be.calledOnce;

		throwErr = true;
		render(<App />, scratch);
		rerender();
		expect(scratch.innerHTML).to.equal('<p>Error</p>');
		expect(thrower).to.be.calledOnce;
		expect(badEffect).to.be.calledOnce;
		expect(goodEffect).to.be.calledOnce;
	});
});
