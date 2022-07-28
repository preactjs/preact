import { createElement, render } from 'preact';
import { setupScratch, teardown } from '../../../test/_util/helpers';
import { useErrorBoundary } from 'preact/hooks';
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
		expect(spy).to.be.calledWith(error);
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
		expect(scratch.innerHTML).to.equal('<p>Error</p>');
		expect(spy).to.be.calledOnce;
		expect(spy2).to.be.calledOnce;
		expect(spy2).to.be.calledWith(error);
	});

	it('ensures referential stability of `reset`', () => {
		const resets = [];

		const Test = () => {
			const [, reset] = useErrorBoundary();

			resets.push(reset);
			return null;
		};

		render(<Test />, scratch);
		rerender();
		render(<Test />, scratch);
		rerender();

		expect(resets[0]).to.equal(resets[1]);
	});

	it('can be called multiple times in a single component, idependently', () => {
		const spy = sinon.spy(),
			spy2 = sinon.spy();
		let resetErr;
		const error = new Error('test');
		const Throws = () => {
			throw error;
		};

		const App = props => {
			const [err, reset] = useErrorBoundary(props.onError);
			const [err2] = useErrorBoundary(props.onError2);
			resetErr = reset;

			return (
				<div>
					{err && <p>Error</p>}
					{err2 && <p>Error2</p>}
					{err || err2 ? null : <Throws />}
				</div>
			);
		};

		render(<App onError={spy} onError2={spy2} />, scratch);
		rerender();
		expect(scratch.innerHTML).to.equal('<div><p>Error</p><p>Error2</p></div>');
		expect(spy).to.be.calledOnce;
		expect(spy).to.be.calledWith(error);
		expect(spy2).to.be.calledOnce;
		expect(spy2).to.be.calledWith(error);

		resetErr();
		rerender();
		expect(scratch.innerHTML).to.equal('<div><p>Error2</p></div>');
		expect(spy).to.be.calledOnce;
		expect(spy).to.be.calledWith(error);
		expect(spy2).to.be.calledOnce;
		expect(spy2).to.be.calledWith(error);
	});
});
