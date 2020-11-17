import { setupRerender } from 'preact/test-utils';
import React, {
	createElement,
	hydrate,
	Component,
	Fragment,
	Suspense
} from 'preact/compat';
import { logCall, getLog, clearLog } from '../../../test/_util/logCall';
import { setupScratch, teardown } from '../../../test/_util/helpers';
import { createLazy } from './suspense-utils';

/* eslint-env browser, mocha */
describe('suspense hydration', () => {
	/** @type {HTMLDivElement} */
	let scratch,
		rerender,
		unhandledEvents = [];

	function onUnhandledRejection(event) {
		unhandledEvents.push(event);
	}

	/** @type {() => void} */
	let increment;
	class Counter extends Component {
		constructor(props) {
			super(props);

			this.state = { count: 0 };
			increment = () => this.setState({ count: ++this.state.count });
		}

		render(props, { count }) {
			return <div>Count: {count}</div>;
		}
	}

	let resetAppendChild;
	let resetInsertBefore;
	let resetRemoveChild;
	let resetRemove;

	before(() => {
		resetAppendChild = logCall(Element.prototype, 'appendChild');
		resetInsertBefore = logCall(Element.prototype, 'insertBefore');
		resetRemoveChild = logCall(Element.prototype, 'removeChild');
		resetRemove = logCall(Element.prototype, 'remove');
	});

	after(() => {
		resetAppendChild();
		resetInsertBefore();
		resetRemoveChild();
		resetRemove();
	});

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

	it('should leave DOM untouched when suspending while hydrating', () => {
		scratch.innerHTML = '<div>Hello</div>';
		clearLog();

		const [Lazy, resolve] = createLazy();
		hydrate(
			<Suspense>
				<Lazy />
			</Suspense>,
			scratch
		);
		rerender(); // Flush rerender queue to mimic what preact will really do
		expect(scratch.innerHTML).to.equal('<div>Hello</div>');
		expect(getLog()).to.deep.equal([]);
		clearLog();

		return resolve(() => <div>Hello</div>).then(() => {
			rerender();
			expect(scratch.innerHTML).to.equal('<div>Hello</div>');
			expect(getLog()).to.deep.equal([]);
			clearLog();
		});
	});

	it('should allow siblings to update around suspense boundary', () => {
		scratch.innerHTML = '<div>Count: 0</div><div>Hello</div>';
		clearLog();

		const [Lazy, resolve] = createLazy();
		hydrate(
			<Fragment>
				<Counter />
				<Suspense>
					<Lazy />
				</Suspense>
			</Fragment>,
			scratch
		);
		rerender(); // Flush rerender queue to mimic what preact will really do
		expect(scratch.innerHTML).to.equal('<div>Count: 0</div><div>Hello</div>');
		// Re: DOM OP below - Known issue with hydrating merged text nodes
		expect(getLog()).to.deep.equal(['<div>Count: .insertBefore(#text, Null)']);
		clearLog();

		increment();
		rerender();

		expect(scratch.innerHTML).to.equal('<div>Count: 1</div><div>Hello</div>');
		expect(getLog()).to.deep.equal([]);
		clearLog();

		return resolve(() => <div>Hello</div>).then(() => {
			rerender();
			expect(scratch.innerHTML).to.equal('<div>Count: 1</div><div>Hello</div>');
			expect(getLog()).to.deep.equal([]);
			clearLog();
		});
	});

	it('should properly hydrate when there is DOM and Components between Suspense and suspender', () => {
		scratch.innerHTML = '<div><div>Hello</div></div>';
		clearLog();

		const [Lazy, resolve] = createLazy();
		hydrate(
			<Suspense>
				<div>
					<Fragment>
						<Lazy />
					</Fragment>
				</div>
			</Suspense>,
			scratch
		);
		rerender(); // Flush rerender queue to mimic what preact will really do
		expect(scratch.innerHTML).to.equal('<div><div>Hello</div></div>');
		expect(getLog()).to.deep.equal([]);
		clearLog();

		return resolve(() => <div>Hello</div>).then(() => {
			rerender();
			expect(scratch.innerHTML).to.equal('<div><div>Hello</div></div>');
			expect(getLog()).to.deep.equal([]);
			clearLog();
		});
	});

	// TODO:
	// 1. What if props change between when hydrate suspended and suspense
	//    resolves?
	// 2. If using real Suspense, test re-suspending after hydrate suspense
	// 3. Put some DOM and components with state and event listeners between
	//    suspender and Suspense boundary
	// 4. Put some sibling DOM and components with state and event listeners
	//    sibling to suspender and under Suspense boundary
});
