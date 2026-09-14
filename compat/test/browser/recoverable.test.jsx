import {
	createElement,
	Fragment,
	hydrate,
	render,
	Suspense,
	browser,
	use,
	useLayoutEffect
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
		expect(value.reason.$$typeof).to.equal(Symbol.for('react.recoverable'));
		expect(value.reason._reason).to.equal(reason);
	});

	it('throws the recoverable to the server renderer', () => {
		const reason = vi.fn();
		const value = Object.freeze(browser(reason));
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
		expect(errors[0]).to.equal(value.reason);
		expect(errors[1]).to.equal(value.reason);
		expect(reason).not.toHaveBeenCalled();
		expect(options._skipEffects).not.to.equal(true);
	});

	it('hydrates a marked fallback until its primary content resolves', async () => {
		let resolve;
		const promise = new Promise(r => {
			resolve = r;
		});
		const onClick = vi.fn();
		function App() {
			use(promise);
			return <div class="primary">content</div>;
		}
		scratch.innerHTML =
			'<p>before</p><!--$s!--><button>fallback</button><!--/$s--><div class="sibling">after</div>';
		const fallback = scratch.querySelector('button');
		const sibling = scratch.lastChild;
		hydrate(
			<Fragment>
				<p>before</p>
				<Suspense fallback={<button onClick={onClick}>fallback</button>}>
					<App />
				</Suspense>
				<div class="sibling">after</div>
			</Fragment>,
			scratch
		);
		expect(scratch.querySelector('button')).to.equal(fallback);
		expect(scratch.lastChild).to.equal(sibling);
		fallback.click();
		expect(onClick).toHaveBeenCalledOnce();
		rerender();
		expect(scratch.querySelector('button')).to.equal(fallback);

		resolve();
		await promise;
		rerender();
		expect(scratch.querySelector('.primary').textContent).to.equal('content');
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
		scratch.firstChild.__r();
		rerender();
		resolve();
		await promise;
		rerender();
		rerender();
		expect(scratch.querySelector('div').className).to.equal('primary');
		expect(scratch.querySelector('div').title).to.equal('new');
		expect(scratch.lastChild.textContent).to.equal('after');
	});

	for (const late of [false, true]) {
		it(`preserves fallback effects and refs through ${late ? 'late' : 'immediate'} recovery`, async () => {
			let resolve;
			const promise = new Promise(r => {
				resolve = r;
			});
			const mount = vi.fn(),
				cleanup = vi.fn(),
				ref = vi.fn(),
				click = vi.fn();
			const mismatch = vi.fn();
			const previousMismatch = options._hydrationMismatch;
			options._hydrationMismatch = mismatch;
			function Fallback() {
				useLayoutEffect(() => {
					mount();
					return cleanup;
				}, []);
				return (
					<button ref={ref} onClick={click} class="fallback">
						loading
					</button>
				);
			}
			function Primary() {
				use(promise);
				return (
					<button class="primary" title="ready">
						ready
					</button>
				);
			}
			try {
				scratch.innerHTML = `<button>before</button><!--$s${late ? ':1' : '!'}--><button class="fallback">loading</button><!--/$s${late ? ':1' : ''}--><button>after</button>`;
				const [before, fallback, after] = scratch.querySelectorAll('button');
				hydrate(
					<Fragment>
						<button>before</button>
						<Suspense fallback={<Fallback />}>
							<Primary />
						</Suspense>
						<button>after</button>
					</Fragment>,
					scratch
				);
				if (late) {
					const marker = fallback.previousSibling;
					marker.data = '$s!:1';
					marker.__r();
				}
				rerender();
				expect(scratch.querySelector('.fallback')).to.equal(fallback);
				fallback.click();
				expect(click).toHaveBeenCalledOnce();
				expect(mount).toHaveBeenCalledOnce();
				expect(cleanup).not.toHaveBeenCalled();
				expect(ref).toHaveBeenCalledExactlyOnceWith(fallback);
				resolve();
				await promise;
				rerender();
				expect(scratch.querySelector('.fallback')).to.equal(null);
				expect(scratch.querySelector('.primary').title).to.equal('ready');
				expect(scratch.firstChild).to.equal(before);
				expect(scratch.lastChild).to.equal(after);
				expect(mount).toHaveBeenCalledOnce();
				expect(cleanup).toHaveBeenCalledOnce();
				expect(ref).toHaveBeenCalledTimes(2);
				expect(ref).toHaveBeenLastCalledWith(null);
				expect(mismatch).not.toHaveBeenCalled();
			} finally {
				options._hydrationMismatch = previousMismatch;
			}
		});
	}

	it('hydrates nested fallback boundaries without claiming their siblings', async () => {
		let resolveOuter, resolveInner;
		const outer = new Promise(r => {
			resolveOuter = r;
		});
		const inner = new Promise(r => {
			resolveInner = r;
		});
		const click = vi.fn();
		function Outer() {
			use(outer);
			return <button class="ready">ready</button>;
		}
		function Inner() {
			use(inner);
			return <button>inner ready</button>;
		}
		scratch.innerHTML =
			'<!--$s!--><!--$s!--><button class="nested">nested</button><!--/$s--><button class="extra">extra</button><!--/$s--><button class="after">after</button>';
		const [nested, extra, after] = scratch.querySelectorAll('button');
		hydrate(
			<Fragment>
				<Suspense
					fallback={
						<Fragment>
							<Suspense
								fallback={
									<button class="nested" onClick={click}>
										nested
									</button>
								}
							>
								<Inner />
							</Suspense>
							<button class="extra">extra</button>
						</Fragment>
					}
				>
					<Outer />
				</Suspense>
				<button class="after">after</button>
			</Fragment>,
			scratch
		);
		expect(scratch.querySelector('.nested'), 'initial nested').to.equal(nested);
		rerender();
		expect(scratch.querySelector('.nested'), 'pending nested').to.equal(nested);
		expect(scratch.querySelector('.extra')).to.equal(extra);
		expect(scratch.lastChild).to.equal(after);
		nested.click();
		expect(click).toHaveBeenCalledOnce();
		resolveOuter();
		await outer;
		rerender();
		expect(scratch.innerHTML).to.equal(
			'<button class="ready">ready</button><button class="after">after</button>'
		);
		resolveInner();
		await inner;
		rerender();
		expect(scratch.innerHTML).to.equal(
			'<button class="ready">ready</button><button class="after">after</button>'
		);
		expect(scratch.lastChild).to.equal(after);
	});
});
