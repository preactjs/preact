import { createElement, render } from 'preact';
import { setupScratch, teardown } from '../../../test/_util/helpers';
import { errorBoundary } from 'preact/hooks';
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
		const Throws = () => {
			throw new Error('test');
		};

		const App = errorBoundary((props, err) => {
			return err ? <p>Error</p> : <Throws />;
		});

		render(<App />, scratch);
		rerender();
		expect(scratch.innerHTML).to.equal('<p>Error</p>');
	});

	it('calls the errorBoundary callback', () => {
		const spy = sinon.spy();
		const error = new Error('test');
		const Throws = () => {
			throw error;
		};

		const App = errorBoundary((props, err) => {
			return err ? <p>Error</p> : <Throws />;
		}, spy);

		render(<App />, scratch);
		rerender();
		expect(scratch.innerHTML).to.equal('<p>Error</p>');
		expect(spy).to.be.calledOnce;
		expect(spy).to.be.calledWith(error);
	});
});
