import {
	createElement,
	Fragment,
	hydrate,
	render,
	Suspense,
	browser,
	use
} from 'preact/compat';
import { options } from 'preact';
import { setupRerender } from 'preact/test-utils';
import { setupScratch, teardown } from '../../../test/_util/helpers';
import { vi } from 'vitest';
import { renderToString } from 'preact-render-to-string';

describe('recoverable rendering', () => {
	let scratch, rerender;
	beforeEach(() => {
		scratch = setupScratch();
		rerender = setupRerender();
	});
	afterEach(() => teardown(scratch));

	it('continues through a recoverable without evaluating its reason', () => {
		const reason = vi.fn(() => {
			throw new Error('unused');
		});
		const value = Object.freeze(browser(reason));
		function App() {
			expect(use(value)).to.equal(undefined);
			return <div>content</div>;
		}
		render(<App />, scratch);
		expect(scratch.innerHTML).to.equal('<div>content</div>');
		expect(reason).not.toHaveBeenCalled();
		expect(value.$$typeof).to.equal(Symbol.for('react.recoverable'));
		expect(value._reason).to.equal(reason);
	});

	it('creates a branded error at each server use site', () => {
		const cause = new Error('requires a browser');
		const reason = vi.fn(() => cause);
		const value = browser(reason);
		function App() {
			use(value);
			return <div>unreachable</div>;
		}
		const errors = [];
		for (let i = 0; i < 2; i++) {
			try {
				renderToString(<App />);
			} catch (error) {
				errors.push(error);
			}
		}
		expect(errors).to.have.length(2);
		expect(errors[0]).not.to.equal(errors[1]);
		expect(errors[0].cause).to.equal(cause);
		expect(errors[0][Symbol.for('react.recoverable')]).to.equal(true);
		expect(reason).toHaveBeenCalledTimes(2);
		expect(options._skipEffects).not.to.equal(true);
	});

	it('still defers if the reason initializer throws', () => {
		function App() {
			use(
				browser(() => {
					throw new Error('diagnostic');
				})
			);
		}
		let caught;
		try {
			renderToString(<App />);
		} catch (error) {
			caught = error;
		}
		expect(caught[Symbol.for('react.recoverable')]).to.equal(true);
		expect(caught.cause).to.equal(
			'The browser-only rendering reason could not be initialized.'
		);
	});

	it('freshly renders a marked fallback without claiming adjacent siblings', () => {
		scratch.innerHTML =
			'<p>before</p><!--$s!--><div class="fallback" title="old">fallback</div><!--/$s--><div class="sibling">after</div>';
		const sibling = scratch.lastChild;
		hydrate(
			<Fragment>
				<p>before</p>
				<Suspense fallback={null}>
					<div class="primary" title="new">
						content
					</div>
				</Suspense>
				<div class="sibling">after</div>
			</Fragment>,
			scratch
		);
		expect(scratch.innerHTML).to.equal(
			'<p>before</p><div title="new" class="primary">content</div><div class="sibling">after</div>'
		);
		expect(scratch.lastChild).to.equal(sibling);
	});

	it('removes nested fallback markers and handles empty primary content', () => {
		scratch.innerHTML =
			'<!--$s!--><!--$s--><i>nested</i><!--/$s--><!--/$s--><b>after</b>';
		const sibling = scratch.lastChild;
		hydrate(
			<Fragment>
				<Suspense fallback={null}>{null}</Suspense>
				<b>after</b>
			</Fragment>,
			scratch
		);
		expect(scratch.innerHTML).to.equal('<b>after</b>');
		expect(scratch.lastChild).to.equal(sibling);
	});

	it('freshly renders a boundary marked after hydration suspended', async () => {
		let resolve;
		const promise = new Promise(r => {
			resolve = r;
		});
		function App() {
			use(promise);
			return (
				<div class="primary" title="new">
					content
				</div>
			);
		}
		scratch.innerHTML =
			'<!--$s:1--><div class="fallback" title="old">fallback</div><!--/$s:1--><b>after</b>';
		hydrate(
			<Fragment>
				<Suspense fallback={null}>
					<App />
				</Suspense>
				<b>after</b>
			</Fragment>,
			scratch
		);
		scratch.firstChild.data = '$s!:1';
		resolve();
		await promise;
		rerender();
		rerender();
		expect(scratch.querySelector('div').className).to.equal('primary');
		expect(scratch.querySelector('div').title).to.equal('new');
		expect(scratch.lastChild.textContent).to.equal('after');
	});
});
