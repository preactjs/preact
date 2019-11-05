import { setupRerender } from 'preact/test-utils';
import React, {
	createElement,
	render,
	Component,
	Suspense,
	SuspenseList
} from 'preact/compat';
import { useState } from 'preact/hooks';
import { setupScratch, teardown } from '../../../test/_util/helpers';

const h = React.createElement;
/* eslint-env browser, mocha */

function getSuspendableComponent() {
	let resolver;
	const SuspendableComponent = () => {
		const [loaded, setLoaded] = useState(false);
		if (!loaded) {
			let promise = new Promise(resolve => {
				resolver = s => {
					setLoaded(s);
					return resolve();
				};
			});
			throw promise;
		}
		return <span>I am resolved.</span>;
	};

	return [SuspendableComponent, s => resolver(s)];
}

describe('suspense-list', () => {
	/** @type {HTMLDivElement} */
	let scratch,
		rerender,
		unhandledEvents = [];

	function onUnhandledRejection(event) {
		unhandledEvents.push(event);
	}

	function getSuspenseList(revealOrder) {
		const [Component1, resolver1] = getSuspendableComponent();
		const [Component2, resolver2] = getSuspendableComponent();
		render(
			<SuspenseList revealOrder={revealOrder}>
				<Suspense fallback={<span>Loading...</span>}>
					<Component1 />
				</Suspense>
				<Suspense fallback={<span>Loading...</span>}>
					<Component2 />
				</Suspense>
			</SuspenseList>,
			scratch
		); // Render initial state

		return {
			Component1,
			Component2,
			resolver1,
			resolver2
		};
	}

	beforeEach(() => {
		scratch = setupScratch();
		rerender = setupRerender();
		unhandledEvents = [];

		if ('onunhandledrejection' in window) {
			window.addEventListener('unhandledrejection', onUnhandledRejection);
		}
	});

	afterEach(() => {
		teardown(scratch);

		if ('onunhandledrejection' in window) {
			window.removeEventListener('unhandledrejection', onUnhandledRejection);

			if (unhandledEvents.length) {
				throw unhandledEvents[0].reason;
			}
		}
	});

	it('should let components appear backwards if no revealOrder is mentioned', async () => {
		const { resolver1, resolver2 } = getSuspenseList();

		rerender(); // Re-render with fallback cuz lazy threw
		expect(scratch.innerHTML).to.eql(
			`<span>Loading...</span><span>Loading...</span>`
		);

		await resolver2(true);
		rerender();
		expect(scratch.innerHTML).to.eql(
			`<span>Loading...</span><span>I am resolved.</span>`
		);

		await resolver1(true);
		rerender();
		expect(scratch.innerHTML).to.eql(
			`<span>I am resolved.</span><span>I am resolved.</span>`
		);
	});

	it('should let components appear forwards if no revealOrder is mentioned', async () => {
		const { resolver1, resolver2 } = getSuspenseList();

		rerender(); // Re-render with fallback cuz lazy threw
		expect(scratch.innerHTML).to.eql(
			`<span>Loading...</span><span>Loading...</span>`
		);

		await resolver1(true);
		rerender();
		expect(scratch.innerHTML).to.eql(
			`<span>I am resolved.</span><span>Loading...</span>`
		);

		await resolver2(true);
		rerender();
		expect(scratch.innerHTML).to.eql(
			`<span>I am resolved.</span><span>I am resolved.</span>`
		);
	});

	it('should let components appear in forwards if revealOrder is forwards and first one resolves before others', async () => {
		const { resolver1, resolver2 } = getSuspenseList('forwards');

		rerender(); // Re-render with fallback cuz lazy threw
		expect(scratch.innerHTML).to.eql(
			`<span>Loading...</span><span>Loading...</span>`
		);

		await resolver1(true);
		rerender();
		expect(scratch.innerHTML).to.eql(
			`<span>I am resolved.</span><span>Loading...</span>`
		);

		await resolver2(true);
		rerender();
		expect(scratch.innerHTML).to.eql(
			`<span>I am resolved.</span><span>I am resolved.</span>`
		);
	});

	it('should make components together if revealOrder is forwards and second one resolves before first', async () => {
		const { resolver1, resolver2 } = getSuspenseList('forwards');

		rerender(); // Re-render with fallback cuz lazy threw
		expect(scratch.innerHTML).to.eql(
			`<span>Loading...</span><span>Loading...</span>`
		);

		await resolver2(true);
		rerender();
		expect(scratch.innerHTML).to.eql(
			`<span>Loading...</span><span>Loading...</span>`
		);

		await resolver1(true);
		rerender();
		expect(scratch.innerHTML).to.eql(
			`<span>I am resolved.</span><span>I am resolved.</span>`
		);
	});

	it('should let components reveal backwards if revealOrder is backwards and second one resolves before first', async () => {
		const { resolver1, resolver2 } = getSuspenseList('backwards');

		rerender(); // Re-render with fallback cuz lazy threw
		expect(scratch.innerHTML).to.eql(
			`<span>Loading...</span><span>Loading...</span>`
		);

		await resolver2(true);
		rerender();
		expect(scratch.innerHTML).to.eql(
			`<span>Loading...</span><span>I am resolved.</span>`
		);

		await resolver1(true);
		rerender();
		expect(scratch.innerHTML).to.eql(
			`<span>I am resolved.</span><span>I am resolved.</span>`
		);
	});

	it('should make components reveal together if revealOrder is backwards and first one resolves before second', async () => {
		const { resolver1, resolver2 } = getSuspenseList('backwards');

		rerender(); // Re-render with fallback cuz lazy threw
		expect(scratch.innerHTML).to.eql(
			`<span>Loading...</span><span>Loading...</span>`
		);

		await resolver1(true);
		rerender();
		expect(scratch.innerHTML).to.eql(
			`<span>Loading...</span><span>Loading...</span>`
		);

		await resolver2(true);
		rerender();
		expect(scratch.innerHTML).to.eql(
			`<span>I am resolved.</span><span>I am resolved.</span>`
		);
	});

	it('should make components reveal together if revealOrder is together and first one resolves before second', async () => {
		const { resolver1, resolver2 } = getSuspenseList('together');

		rerender(); // Re-render with fallback cuz lazy threw
		expect(scratch.innerHTML).to.eql(
			`<span>Loading...</span><span>Loading...</span>`
		);

		await resolver1(true);
		rerender();
		expect(scratch.innerHTML).to.eql(
			`<span>Loading...</span><span>Loading...</span>`
		);

		await resolver2(true);
		rerender();
		expect(scratch.innerHTML).to.eql(
			`<span>I am resolved.</span><span>I am resolved.</span>`
		);
	});

	it('should make components reveal together if revealOrder is together and second one resolves before first', async () => {
		const { resolver1, resolver2 } = getSuspenseList('together');

		rerender(); // Re-render with fallback cuz lazy threw
		expect(scratch.innerHTML).to.eql(
			`<span>Loading...</span><span>Loading...</span>`
		);

		await resolver2(true);
		rerender();
		expect(scratch.innerHTML).to.eql(
			`<span>Loading...</span><span>Loading...</span>`
		);

		await resolver1(true);
		rerender();
		expect(scratch.innerHTML).to.eql(
			`<span>I am resolved.</span><span>I am resolved.</span>`
		);
	});
});
