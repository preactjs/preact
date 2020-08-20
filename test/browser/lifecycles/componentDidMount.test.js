import { createElement, createRoot, Component } from 'preact';
import { setupScratch, teardown } from '../../_util/helpers';

/** @jsx createElement */

describe('Lifecycle methods', () => {
	/** @type {HTMLDivElement} */
	let scratch;

	let render;

	beforeEach(() => {
		scratch = setupScratch();
		({ render } = createRoot(scratch));
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

			render(<App />);
			expect(spy).to.have.been.calledOnceWith(scratch.firstChild);
		});
	});
});
