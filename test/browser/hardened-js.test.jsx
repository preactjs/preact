import { createElement, render, Component, Fragment } from 'preact';
import { setupRerender } from 'preact/test-utils';
import { setupScratch, teardown } from '../_util/helpers';
import { expect } from 'vitest';

/** @jsx createElement */
/** @jsxFrag Fragment */

// Hardened JavaScript environments (SES `lockdown()`, `node
// --frozen-intrinsics`, LavaMoat) freeze `Object.prototype`, which makes
// `Object.prototype.constructor` non-writable. Copying a vnode — which carries
// `constructor: undefined` as its JSON-injection guard — onto a bare `{}` then
// hits the "override mistake" and throws. See #5109.
//
// Making `constructor` non-writable is the narrowest reproduction of that and,
// unlike freezing, it is reversible so the rest of the suite is unaffected.
describe('hardened JS (non-writable Object.prototype.constructor)', () => {
	let scratch, rerender, originalDescriptor;

	beforeEach(() => {
		scratch = setupScratch();
		rerender = setupRerender();

		originalDescriptor = Object.getOwnPropertyDescriptor(
			Object.prototype,
			'constructor'
		);
		Object.defineProperty(Object.prototype, 'constructor', {
			...originalDescriptor,
			writable: false
		});
	});

	afterEach(() => {
		Object.defineProperty(Object.prototype, 'constructor', originalDescriptor);
		teardown(scratch);
	});

	it('should re-render a component when Object.prototype is hardened', () => {
		class Counter extends Component {
			constructor(props) {
				super(props);
				this.state = { count: 0 };
			}

			render() {
				return (
					<button
						onClick={() => this.setState({ count: this.state.count + 1 })}
					>
						{this.state.count}
					</button>
				);
			}
		}

		render(<Counter />, scratch);
		expect(scratch.innerHTML).to.equal('<button>0</button>');

		scratch.firstChild.click();
		rerender();
		expect(scratch.innerHTML).to.equal('<button>1</button>');
	});

	it('should render a component returning a Fragment when Object.prototype is hardened', () => {
		// keyless Fragment results get cloned through `cloneNode`
		const App = () => (
			<>
				<span>a</span>
				<span>b</span>
			</>
		);

		render(<App />, scratch);
		expect(scratch.innerHTML).to.equal('<span>a</span><span>b</span>');
	});
});
