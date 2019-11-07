import { setupRerender } from 'preact/test-utils';
import React, {
	createElement,
	render,
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
	SuspendableComponent.resolve = s => {
		resolver(s);
	};

	return SuspendableComponent;
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
		const Component1 = getSuspendableComponent();
		const Component2 = getSuspendableComponent();
		const Component3 = getSuspendableComponent();
		render(
			<SuspenseList revealOrder={revealOrder}>
				<Suspense fallback={<span>Loading...</span>}>
					<Component1 />
				</Suspense>
				<Suspense fallback={<span>Loading...</span>}>
					<Component2 />
				</Suspense>
				<Suspense fallback={<span>Loading...</span>}>
					<Component3 />
				</Suspense>
			</SuspenseList>,
			scratch
		); // Render initial state

		return [Component1.resolve, Component2.resolve, Component3.resolve];
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

	it('should work for single element', async () => {
		const Component = getSuspendableComponent();
		render(
			<SuspenseList>
				<Suspense fallback={<span>Loading...</span>}>
					<Component />
				</Suspense>
			</SuspenseList>,
			scratch
		); // Render initial state

		rerender(); // Re-render with fallback cuz lazy threw
		expect(scratch.innerHTML).to.eql(`<span>Loading...</span>`);

		await Component.resolve(true);
		rerender();
		expect(scratch.innerHTML).to.eql(`<span>I am resolved.</span>`);
	});

	it('should let components appear backwards if no revealOrder is mentioned', async () => {
		const [resolver1, resolver2, resolver3] = getSuspenseList();

		rerender(); // Re-render with fallback cuz lazy threw
		expect(scratch.innerHTML).to.eql(
			`<span>Loading...</span><span>Loading...</span><span>Loading...</span>`
		);

		await resolver2(true);
		rerender();
		expect(scratch.innerHTML).to.eql(
			`<span>Loading...</span><span>I am resolved.</span><span>Loading...</span>`
		);

		await resolver3(true);
		rerender();
		expect(scratch.innerHTML).to.eql(
			`<span>Loading...</span><span>I am resolved.</span><span>I am resolved.</span>`
		);

		await resolver1(true);
		rerender();
		expect(scratch.innerHTML).to.eql(
			`<span>I am resolved.</span><span>I am resolved.</span><span>I am resolved.</span>`
		);
	});

	it('should let components appear forwards if no revealOrder is mentioned', async () => {
		const [resolver1, resolver2, resolver3] = getSuspenseList();

		rerender(); // Re-render with fallback cuz lazy threw
		expect(scratch.innerHTML).to.eql(
			`<span>Loading...</span><span>Loading...</span><span>Loading...</span>`
		);

		await resolver1(true);
		rerender();
		expect(scratch.innerHTML).to.eql(
			`<span>I am resolved.</span><span>Loading...</span><span>Loading...</span>`
		);

		await resolver2(true);
		rerender();
		expect(scratch.innerHTML).to.eql(
			`<span>I am resolved.</span><span>I am resolved.</span><span>Loading...</span>`
		);

		await resolver3(true);
		rerender();
		expect(scratch.innerHTML).to.eql(
			`<span>I am resolved.</span><span>I am resolved.</span><span>I am resolved.</span>`
		);
	});

	it('should let components appear in forwards if revealOrder=forwards and first one resolves before others', async () => {
		const [resolver1, resolver2, resolver3] = getSuspenseList('forwards');

		rerender(); // Re-render with fallback cuz lazy threw
		expect(scratch.innerHTML).to.eql(
			`<span>Loading...</span><span>Loading...</span><span>Loading...</span>`
		);

		await resolver1(true);
		rerender();
		expect(scratch.innerHTML).to.eql(
			`<span>I am resolved.</span><span>Loading...</span><span>Loading...</span>`
		);

		await resolver3(true);
		rerender();
		expect(scratch.innerHTML).to.eql(
			`<span>I am resolved.</span><span>Loading...</span><span>Loading...</span>`
		);

		await resolver2(true);
		rerender();
		expect(scratch.innerHTML).to.eql(
			`<span>I am resolved.</span><span>I am resolved.</span><span>I am resolved.</span>`
		);
	});

	it('should make components appear together if revealOrder=forwards and others resolves before first', async () => {
		const [resolver1, resolver2, resolver3] = getSuspenseList('forwards');

		rerender(); // Re-render with fallback cuz lazy threw
		expect(scratch.innerHTML).to.eql(
			`<span>Loading...</span><span>Loading...</span><span>Loading...</span>`
		);

		await resolver2(true);
		rerender();
		expect(scratch.innerHTML).to.eql(
			`<span>Loading...</span><span>Loading...</span><span>Loading...</span>`
		);

		await resolver3(true);
		rerender();
		expect(scratch.innerHTML).to.eql(
			`<span>Loading...</span><span>Loading...</span><span>Loading...</span>`
		);

		await resolver1(true);
		rerender();
		expect(scratch.innerHTML).to.eql(
			`<span>I am resolved.</span><span>I am resolved.</span><span>I am resolved.</span>`
		);
	});

	it('should let components appear backwards if revealOrder=backwards and others resolves before first', async () => {
		const [resolver1, resolver2, resolver3] = getSuspenseList('backwards');

		rerender(); // Re-render with fallback cuz lazy threw
		expect(scratch.innerHTML).to.eql(
			`<span>Loading...</span><span>Loading...</span><span>Loading...</span>`
		);

		await resolver3(true);
		rerender();
		expect(scratch.innerHTML).to.eql(
			`<span>Loading...</span><span>Loading...</span><span>I am resolved.</span>`
		);

		await resolver2(true);
		rerender();
		expect(scratch.innerHTML).to.eql(
			`<span>Loading...</span><span>I am resolved.</span><span>I am resolved.</span>`
		);

		await resolver1(true);
		rerender();
		expect(scratch.innerHTML).to.eql(
			`<span>I am resolved.</span><span>I am resolved.</span><span>I am resolved.</span>`
		);
	});

	it('should make components appear together if revealOrder=backwards and first one resolves others', async () => {
		const [resolver1, resolver2, resolver3] = getSuspenseList('backwards');

		rerender(); // Re-render with fallback cuz lazy threw
		expect(scratch.innerHTML).to.eql(
			`<span>Loading...</span><span>Loading...</span><span>Loading...</span>`
		);

		await resolver1(true);
		rerender();
		expect(scratch.innerHTML).to.eql(
			`<span>Loading...</span><span>Loading...</span><span>Loading...</span>`
		);

		await resolver3(true);
		rerender();
		expect(scratch.innerHTML).to.eql(
			`<span>Loading...</span><span>Loading...</span><span>I am resolved.</span>`
		);

		await resolver2(true);
		rerender();
		expect(scratch.innerHTML).to.eql(
			`<span>I am resolved.</span><span>I am resolved.</span><span>I am resolved.</span>`
		);
	});

	it('should make components appear together if revealOrder=together and first one resolves others', async () => {
		const [resolver1, resolver2, resolver3] = getSuspenseList('together');

		rerender(); // Re-render with fallback cuz lazy threw
		expect(scratch.innerHTML).to.eql(
			`<span>Loading...</span><span>Loading...</span><span>Loading...</span>`
		);

		await resolver1(true);
		rerender();
		expect(scratch.innerHTML).to.eql(
			`<span>Loading...</span><span>Loading...</span><span>Loading...</span>`
		);

		await resolver3(true);
		rerender();
		expect(scratch.innerHTML).to.eql(
			`<span>Loading...</span><span>Loading...</span><span>Loading...</span>`
		);

		await resolver2(true);
		rerender();
		expect(scratch.innerHTML).to.eql(
			`<span>I am resolved.</span><span>I am resolved.</span><span>I am resolved.</span>`
		);
	});

	it('should make components appear together if revealOrder=together and second one resolves before others', async () => {
		const [resolver1, resolver2, resolver3] = getSuspenseList('together');

		rerender(); // Re-render with fallback cuz lazy threw
		expect(scratch.innerHTML).to.eql(
			`<span>Loading...</span><span>Loading...</span><span>Loading...</span>`
		);

		await resolver2(true);
		rerender();
		expect(scratch.innerHTML).to.eql(
			`<span>Loading...</span><span>Loading...</span><span>Loading...</span>`
		);

		await resolver1(true);
		rerender();
		expect(scratch.innerHTML).to.eql(
			`<span>Loading...</span><span>Loading...</span><span>Loading...</span>`
		);

		await resolver3(true);
		rerender();
		expect(scratch.innerHTML).to.eql(
			`<span>I am resolved.</span><span>I am resolved.</span><span>I am resolved.</span>`
		);
	});

	it('should not do anything to non suspense elements', async () => {
		const Component1 = getSuspendableComponent();
		const Component2 = getSuspendableComponent();
		render(
			<SuspenseList>
				<Suspense fallback={<span>Loading...</span>}>
					<Component1 />
				</Suspense>
				<div>foo</div>
				<Suspense fallback={<span>Loading...</span>}>
					<Component2 />
				</Suspense>
				<span>bar</span>
			</SuspenseList>,
			scratch
		);

		rerender(); // Re-render with fallback cuz lazy threw
		expect(scratch.innerHTML).to.eql(
			`<span>Loading...</span><div>foo</div><span>Loading...</span><span>bar</span>`
		);

		await Component1.resolve(true);
		rerender();
		expect(scratch.innerHTML).to.eql(
			`<span>I am resolved.</span><div>foo</div><span>Loading...</span><span>bar</span>`
		);

		await Component2.resolve(true);
		rerender();
		expect(scratch.innerHTML).to.eql(
			`<span>I am resolved.</span><div>foo</div><span>I am resolved.</span><span>bar</span>`
		);
	});

	it('should make sure nested SuspenseList works with forwards', async () => {
		const Component1 = getSuspendableComponent();
		const Component2 = getSuspendableComponent();
		const Component3 = getSuspendableComponent();
		const Component4 = getSuspendableComponent();

		render(
			<SuspenseList>
				<Suspense fallback={<span>Loading...</span>}>
					<Component1 />
				</Suspense>
				<SuspenseList>
					<Suspense fallback={<span>Loading...</span>}>
						<Component2 />
					</Suspense>
					<Suspense fallback={<span>Loading...</span>}>
						<Component3 />
					</Suspense>
				</SuspenseList>
				<Suspense fallback={<span>Loading...</span>}>
					<Component4 />
				</Suspense>
			</SuspenseList>,
			scratch
		);

		rerender(); // Re-render with fallback cuz lazy threw
		expect(scratch.innerHTML).to.eql(
			`<span>Loading...</span><span>Loading...</span><span>Loading...</span><span>Loading...</span>`
		);

		await Component2.resolve(true);
		rerender();
		expect(scratch.innerHTML).to.eql(
			`<span>Loading...</span><span>Loading...</span><span>Loading...</span><span>Loading...</span>`
		);

		await Component1.resolve(true);
		rerender();
		expect(scratch.innerHTML).to.eql(
			`<span>I am resolved.</span><span>I am resolved.</span><span>Loading...</span><span>Loading...</span>`
		);

		await Component4.resolve(true);
		rerender();
		expect(scratch.innerHTML).to.eql(
			`<span>I am resolved.</span><span>I am resolved.</span><span>Loading...</span><span>Loading...</span>`
		);

		await Component3.resolve(true);
		rerender();
		expect(scratch.innerHTML).to.eql(
			`<span>I am resolved.</span><span>I am resolved.</span><span>I am resolved.</span><span>I am resolved.</span>`
		);
	});

	it.skip('should make sure nested SuspenseList works with backwards', async () => {});

	it.skip('should make sure nested SuspenseList works with together', async () => {});
});
