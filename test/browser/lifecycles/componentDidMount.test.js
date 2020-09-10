import { createElement, render, Component } from 'preact';
import { setupScratch, teardown } from '../../_util/helpers';
import sinon from 'sinon';
import { expect } from 'expectus';

describe('Lifecycle methods', () => {
	/** @type {HTMLDivElement} */
	let scratch;

	beforeEach(() => {
		scratch = setupScratch();
	});

	afterEach(() => {
		teardown(scratch);
	});

	describe('#componentDidMount', () => {
		it('is invoked after refs are set', () => {
			const spy = sinon.spy();

			class App extends Component {
				componentDidMount() {
					expect(spy).to.have.been.calledOnceWith(scratch.firstChild);
				}

				render() {
					return <div ref={spy} />;
				}
			}

			render(<App />, scratch);
			expect(spy).to.have.been.calledOnceWith(scratch.firstChild);
		});
	});
});
