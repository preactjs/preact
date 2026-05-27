import { createElement, render, Component } from 'preact';
import { setupRerender } from 'preact/test-utils';
import { setupScratch, teardown } from '../../_util/helpers';
import { vi } from 'vitest';

describe('Lifecycle methods', () => {
	/** @type {HTMLDivElement} */
	let scratch;
	let rerender;

	beforeEach(() => {
		scratch = setupScratch();
		rerender = setupRerender();
	});

	afterEach(() => {
		teardown(scratch);
	});

	describe('#componentDidMount', () => {
		it('is invoked after refs are set', () => {
			const spy = vi.fn();

			class App extends Component {
				componentDidMount() {
					expect(spy).toHaveBeenCalledOnce();
					expect(spy).toHaveBeenCalledWith(scratch.firstChild);
				}

				render() {
					return <div ref={spy} />;
				}
			}

			render(<App />, scratch);
			expect(spy).toHaveBeenCalledOnce();
			expect(spy).toHaveBeenCalledWith(scratch.firstChild);
		});

		it('supports multiple setState callbacks', () => {
			const spy = vi.fn();

			class App extends Component {
				constructor(props) {
					super(props);
					this.state = { count: 0 };
				}

				componentDidMount() {
					// eslint-disable-next-line
					this.setState({ count: 1 }, spy);
					// eslint-disable-next-line
					this.setState({ count: 2 }, spy);
				}

				render() {
					return <div />;
				}
			}

			render(<App />, scratch);

			rerender();
			expect(spy).toHaveBeenCalledTimes(2);
		});
	});
});
