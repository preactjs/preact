import { Component, createElement, options, render } from 'preact';
import { useEffect, useLayoutEffect, useState } from 'preact/hooks';
import { act } from 'preact/test-utils';
import { unstable_batchedUpdates, flushSync } from 'preact/compat';
import { vi } from 'vitest';
import { setupScratch, teardown } from '../../../test/_util/helpers';

describe('unstable_batchedUpdates', () => {
	it('should execute & return cb', () => {
		expect(unstable_batchedUpdates(() => false)).to.equal(false);
		expect(unstable_batchedUpdates(arg => arg, true)).to.equal(true);
	});
});

describe('flushSync', () => {
	/** @type {HTMLDivElement} */
	let scratch;

	beforeEach(() => {
		scratch = setupScratch();
	});

	afterEach(() => {
		teardown(scratch);
	});

	it('should invoke the given callback', () => {
		const returnValue = {};
		const spy = vi.fn(() => returnValue);
		const result = flushSync(spy);

		expect(spy).toHaveBeenCalledOnce();
		expect(result).to.equal(returnValue);
	});

	it('should batch updates and flush them synchronously', () => {
		let setA;
		let setB;
		const renders = vi.fn();

		function App() {
			const [a, updateA] = useState(0);
			const [b, updateB] = useState(0);
			setA = updateA;
			setB = updateB;
			renders();
			return <p>{a + b}</p>;
		}

		render(<App />, scratch);
		flushSync(() => {
			setA(1);
			setB(1);
		});

		expect(scratch.textContent).to.equal('2');
		expect(renders).toHaveBeenCalledTimes(2);
	});

	describe('inside a diff or commit (#5410)', () => {
		/** @type {HTMLDivElement} */
		let other;
		let update;

		function Other() {
			const [value, setValue] = useState(0);
			update = setValue;
			return value;
		}

		beforeEach(() => {
			other = document.createElement('div');
			render(<Other />, other);
		});

		it('should not run the passive cleanup of a component that is still unmounting', () => {
			function Widget() {
				const [closed, setClosed] = useState(false);
				useEffect(() => () => setClosed(true), []);
				useLayoutEffect(() => () => flushSync(() => update(1)), []);
				return closed ? <b>closed</b> : <i>open</i>;
			}

			act(() => render(<Widget />, scratch));
			act(() => render(null, scratch));

			expect(scratch.innerHTML).to.equal('');
			expect(other.textContent).to.equal('1');
		});

		it('should not route the cleanup error of another root to the component that flushes', () => {
			const previous = document.createElement('div');
			const paints = [];
			const prevRaf = options.requestAnimationFrame;
			options.requestAnimationFrame = cb => paints.push(cb);
			const paint = () => paints.splice(0).forEach(cb => cb());

			function Leaving() {
				useEffect(
					() => () => {
						throw new Error('dispose');
					},
					[]
				);
				return null;
			}
			class Boundary extends Component {
				componentDidCatch() {
					this.setState({ failed: true });
				}
				render() {
					return this.state.failed ? 'fallback' : this.props.children;
				}
			}
			class Widget extends Component {
				componentDidMount() {
					flushSync(() => update(1));
				}
				render() {
					return 'widget';
				}
			}

			try {
				render(<Leaving />, previous);
				paint();
				render(null, previous);
				render(
					<Boundary>
						<Widget />
					</Boundary>,
					scratch
				);

				expect(scratch.textContent).to.equal('widget');
				expect(other.textContent).to.equal('1');
				expect(paint).to.throw('dispose');
			} finally {
				options.requestAnimationFrame = prevRaf;
			}
		});
	});
});
