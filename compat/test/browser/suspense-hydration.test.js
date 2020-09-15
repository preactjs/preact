import { setupRerender } from 'preact/test-utils';
import React, {
	createElement,
	hydrate,
	Component,
	Fragment,
	Suspense
} from 'preact/compat';
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

	class ErrorBoundary {
		componentDidCatch(err) {
			if (err && err.then) this.__d = true;
		}

		render(props) {
			return props.children;
		}
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

	it('should leave DOM untouched when suspending while hydrating', () => {
		scratch.innerHTML = '<div>Hello</div>';

		const [Lazy, resolve] = createLazy();
		hydrate(
			<ErrorBoundary>
				<Lazy />
			</ErrorBoundary>,
			scratch
		);
		rerender(); // Flush rerender queue to mimic what preact will really do
		expect(scratch.innerHTML).to.equal('<div>Hello</div>');

		return resolve(() => <div>Hello</div>).then(() => {
			rerender();
			expect(scratch.innerHTML).to.equal('<div>Hello</div>');
		});
	});

	it('should allow siblings to update around suspense boundary', () => {
		scratch.innerHTML = '<div>Count: 0</div><div>Hello</div>';

		const [Lazy, resolve] = createLazy();
		hydrate(
			<Fragment>
				<Counter />
				<ErrorBoundary>
					<Lazy />
				</ErrorBoundary>
			</Fragment>,
			scratch
		);
		rerender(); // Flush rerender queue to mimic what preact will really do
		expect(scratch.innerHTML).to.equal('<div>Count: 0</div><div>Hello</div>');

		increment();
		rerender();
		expect(scratch.innerHTML).to.equal('<div>Count: 1</div><div>Hello</div>');

		return resolve(() => <div>Hello</div>).then(() => {
			rerender();
			expect(scratch.innerHTML).to.equal('<div>Count: 1</div><div>Hello</div>');
		});
	});

	// TODO:
	// 1. What if props change between when hydrate suspended and suspense resolves?
	// 2. If using real Suspense, test re-suspending after hydrate suspense
});
