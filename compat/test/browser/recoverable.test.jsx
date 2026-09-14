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

	it('resolves in the browser without evaluating its reason', () => {
		const reason = vi.fn();
		const value = Object.freeze(browser(reason));
		function App() {
			expect(use(value)).to.equal(undefined);
			return <div>content</div>;
		}
		render(<App />, scratch);
		expect(scratch.innerHTML).to.equal('<div>content</div>');
		expect(reason).not.toHaveBeenCalled();
	});

	it('settles synchronously without retaining callbacks', async () => {
		const value = browser();
		const resolve = vi.fn();
		value.then(resolve);
		expect(resolve).toHaveBeenCalledOnce();
		expect(await value).to.equal(undefined);
	});

	it('remains fulfilled when rendering to a string in the browser', () => {
		const value = Object.freeze(browser());
		function App() {
			use(value);
			return <i>content</i>;
		}
		expect(renderToString(<App />)).to.equal('<i>content</i>');
	});

	it('replaces a marked fallback without claiming adjacent siblings', () => {
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
			'<p>before</p><div class="primary" title="new">content</div><div class="sibling">after</div>'
		);
		expect(scratch.lastChild).to.equal(sibling);
	});

	it('leaves the server fallback inert while primary content is pending', async () => {
		let resolve;
		const promise = new Promise(r => {
			resolve = r;
		});
		function App() {
			use(promise);
			return <div class="primary">content</div>;
		}
		scratch.innerHTML =
			'<!--$s!--><button title="server">server fallback</button><!--/$s--><b>after</b>';
		const serverFallback = scratch.querySelector('button');
		hydrate(
			<Fragment>
				<Suspense fallback={<button title="client">client fallback</button>}>
					<App />
				</Suspense>
				<b>after</b>
			</Fragment>,
			scratch
		);
		rerender();
		const clientFallback = scratch.querySelector('button');
		expect(clientFallback).to.equal(serverFallback);
		expect(clientFallback.title).to.equal('server');
		resolve();
		await promise;
		rerender();
		expect(scratch.querySelector('.primary').textContent).to.equal('content');
		expect(scratch.lastElementChild.textContent).to.equal('after');
	});

	it('replaces nested and late marked fallback ranges', async () => {
		let resolve;
		const promise = new Promise(r => {
			resolve = r;
		});
		function App() {
			use(promise);
			return <i title="new">ready</i>;
		}
		scratch.innerHTML =
			'<!--$s:1--><!--$s--><i>nested</i><!--/$s--><!--/$s:1--><b>after</b>';
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
		expect(scratch.innerHTML).to.equal('<i title="new">ready</i><b>after</b>');
	});

	it('removes a marked last-child fallback for empty primary content', () => {
		scratch.innerHTML = '<!--$s!--><i>fallback</i><!--/$s-->';
		hydrate(<Suspense fallback={null}>{null}</Suspense>, scratch);
		expect(scratch.innerHTML).to.equal('');
	});

	it('does not claim an adjacent same-tag sibling', () => {
		scratch.innerHTML =
			'<!--$s!--><i class="fallback">fallback</i><!--/$s--><i class="after">after</i>';
		const after = scratch.lastChild;
		hydrate(
			<Fragment>
				<Suspense fallback={null}>
					<i class="primary">ready</i>
				</Suspense>
				<i class="after">after</i>
			</Fragment>,
			scratch
		);
		expect(scratch.querySelector('.primary')).not.to.equal(after);
		expect(scratch.lastChild).to.equal(after);
		expect(scratch.innerHTML).to.equal(
			'<i class="primary">ready</i><i class="after">after</i>'
		);
	});

	it('does not steal adjacent DOM for additional primary siblings', () => {
		const click = vi.fn();
		const mismatch = vi.fn();
		const oldMismatch = options._hydrationMismatch;
		options._hydrationMismatch = mismatch;
		scratch.innerHTML =
			'<!--$s!--><i class="fallback">fallback</i><!--/$s--><i class="after">after</i>';
		const after = scratch.lastElementChild;
		try {
			hydrate(
				<Fragment>
					<Suspense fallback={null}>
						<i class="one" title="fresh" onClick={click}>
							one
						</i>
						<i class="two">two</i>
					</Suspense>
					<i class="after">after</i>
				</Fragment>,
				scratch
			);
			const elements = [...scratch.querySelectorAll('i')];
			expect(elements.map(node => node.className)).to.deep.equal([
				'one',
				'two',
				'after'
			]);
			expect(elements[0].title).to.equal('fresh');
			elements[0].click();
			expect(click).toHaveBeenCalledOnce();
			expect(elements[2]).to.equal(after);
			expect(mismatch).not.toHaveBeenCalled();
		} finally {
			options._hydrationMismatch = oldMismatch;
		}
	});

	it('keeps the recovery range through repeated suspension', async () => {
		let resolveFirst, resolveSecond;
		const first = new Promise(r => {
			resolveFirst = r;
		});
		const second = new Promise(r => {
			resolveSecond = r;
		});
		function Primary() {
			use(first);
			use(second);
			return <i class="primary">ready</i>;
		}
		scratch.innerHTML =
			'<!--$s!--><i class="fallback">loading</i><!--/$s--><i class="after">after</i>';
		const fallback = scratch.querySelector('.fallback'),
			after = scratch.lastChild;
		hydrate(
			<Fragment>
				<Suspense fallback={null}>
					<Primary />
				</Suspense>
				<i class="after">after</i>
			</Fragment>,
			scratch
		);
		resolveFirst();
		await first;
		rerender();
		expect(scratch.querySelector('.fallback')).to.equal(fallback);
		expect(scratch.lastElementChild).to.equal(after);
		resolveSecond();
		await second;
		rerender();
		expect(scratch.innerHTML).to.equal(
			'<i class="primary">ready</i><i class="after">after</i>'
		);
		expect(scratch.lastChild).to.equal(after);
	});
});
