import { setupRerender } from 'preact/test-utils';
import React, {
	createElement,
	render,
	Suspense,
	Fragment,
	useId,
	useState
} from 'preact/compat';
import { setupScratch, teardown } from '../../../test/_util/helpers';
import { createLazy } from './suspense-utils';
import { expect } from 'chai';

/* eslint-env browser, mocha */

/**
 * Repro for a popover-anchor mismatch we hit in production. Two
 * `useId()`-using components rendered in different parts of the same
 * page can share the same `Px-y` value when one of them only mounts
 * after a Suspense boundary resolves later in the page lifecycle. The
 * symptom in the app was: a `<button style="anchor-name: --skui-menu-${useId()}">`
 * trigger and its sibling `<div popover style="position-anchor: --skui-menu-${useId()}">`
 * both ended up with `--skui-menu-P0-0` because a totally unrelated
 * trigger elsewhere on the page (rendered inside a Suspense boundary)
 * also held that name. Clicking the second button opened a popover
 * that the browser anchored against the first button.
 *
 * This file covers two shapes:
 * 1. A late mount via state — already passes today, kept as a control.
 * 2. A late mount via `Suspense + lazy` — currently passes too in the
 *    standalone harness, but is included so a regression in either
 *    direction would fail loudly.
 *
 * If you want to reproduce the anchor-name collision specifically, the
 * Sessions screenshot at https://github.com/SessionsCode/Sessions/pull/459
 * shows the visual symptom. The standalone Node repro at the bottom of
 * this file's PR description (`/tmp/preact-useId-repro.mjs` in the PR
 * branch's notes) shows what we tried.
 */
describe('useId across Suspense / late mounts', () => {
	/** @type {HTMLDivElement} */
	let scratch;
	/** @type {() => void} */
	let rerender;

	beforeEach(() => {
		scratch = setupScratch();
		rerender = setupRerender();
	});

	afterEach(() => {
		teardown(scratch);
	});

	it('does not reuse the same id across a Suspense-resolved sibling', async () => {
		function Eager() {
			const id = useId();
			return <p data-source="eager" id={id} />;
		}

		function Late() {
			const id = useId();
			return <p data-source="late" id={id} />;
		}

		const [LazyLate, resolveLate] = createLazy();

		function App() {
			return (
				<Fragment>
					<Eager />
					<Suspense fallback={<span>loading</span>}>
						<LazyLate />
					</Suspense>
				</Fragment>
			);
		}

		render(<App />, scratch);
		// Surface the suspense fallback before the lazy resolves.
		rerender();

		expect(scratch.querySelector('[data-source="eager"]')).not.to.equal(null);

		await resolveLate(Late);
		rerender();

		const eagerId = scratch
			.querySelector('[data-source="eager"]')
			.getAttribute('id');
		const lateId = scratch
			.querySelector('[data-source="late"]')
			.getAttribute('id');

		expect(eagerId).to.be.a('string').and.not.to.equal('');
		expect(lateId).to.be.a('string').and.not.to.equal('');

		// In the standalone repro this passes (eager=P0-0, late=P0-1),
		// so the test is here as a guardrail rather than a known-fail.
		// If it ever fails, the symptom in the app is the popover
		// anchor-name collision described in the doc comment above.
		expect(lateId).to.not.equal(eagerId);
	});

	it('does not reuse the same id when a sibling mounts later via state', () => {
		// Control: same shape as the lazy variant minus the async
		// boundary. Late mount by state should still produce a distinct
		// id, and does today.
		let setShow;

		function Eager() {
			const id = useId();
			return <p data-source="eager" id={id} />;
		}

		function Late() {
			const id = useId();
			return <p data-source="late" id={id} />;
		}

		function App() {
			const [show, setShowState] = useState(false);
			setShow = setShowState;
			return (
				<Fragment>
					<Eager />
					{show ? <Late /> : null}
				</Fragment>
			);
		}

		render(<App />, scratch);
		setShow(true);
		rerender();

		const eagerId = scratch
			.querySelector('[data-source="eager"]')
			.getAttribute('id');
		const lateId = scratch
			.querySelector('[data-source="late"]')
			.getAttribute('id');

		expect(lateId).to.not.equal(eagerId);
	});
});
