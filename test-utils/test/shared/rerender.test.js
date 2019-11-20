import { options, createElement, render, Component } from 'preact';
import { teardown, setupRerender } from 'preact/test-utils';

/** @jsx createElement */

describe('setupRerender & teardown', () => {
	/** @type {HTMLDivElement} */
	let scratch;

	beforeEach(() => {
		scratch = document.createElement('div');
	});

	it('should restore previous debounce', () => {
		let spy = (options.debounceRendering = sinon.spy());

		setupRerender();
		teardown();

		expect(options.debounceRendering).to.equal(spy);
	});

	it('teardown should flush the queue', () => {
		/** @type {() => void} */
		let increment;
		class Counter extends Component {
			constructor(props) {
				super(props);

				this.state = { count: 0 };
				increment = () => this.setState({ count: this.state.count + 1 });
			}

			render() {
				return <div>{this.state.count}</div>;
			}
		}

		sinon.spy(Counter.prototype, 'render');

		// Setup rerender
		setupRerender();

		// Initial render
		render(<Counter />, scratch);
		expect(Counter.prototype.render).to.have.been.calledOnce;
		expect(scratch.innerHTML).to.equal('<div>0</div>');

		// queue rerender
		increment();
		expect(Counter.prototype.render).to.have.been.calledOnce;
		expect(scratch.innerHTML).to.equal('<div>0</div>');

		// Pretend test forgot to call rerender. Teardown should do that
		teardown();
		expect(Counter.prototype.render).to.have.been.calledTwice;
		expect(scratch.innerHTML).to.equal('<div>1</div>');
	});
});
