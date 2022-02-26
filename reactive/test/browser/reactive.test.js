/* eslint-disable react/display-name */
import { createElement, render } from 'preact';
import { $, component } from 'preact/reactive';
import { setupRerender } from 'preact/test-utils';
import { setupScratch, teardown } from '../../../test/_util/helpers';

/** @jsx createElement */

function atom(initalValue) {
	const noopListener = v => null;
	let listener = noopListener;
	let value = initalValue;

	const atom = {
		_unsubSpy: undefined,
		_value: value,
		subscribe(newListener) {
			listener = newListener;
			listener(value);
			atom._unsubSpy = sinon.spy(() => {
				listener = noopListener;
			});
			return atom._unsubSpy;
		},
		update(newValue) {
			value = newValue;
			atom._value = value;
			listener(value);
		}
	};

	return atom;
}

describe('Reactive', () => {
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

	it('should subscribe to atoms', () => {
		const name = atom('foo');

		function App() {
			return <div>{$(name)}</div>;
		}

		render(<App />, scratch);
		expect(scratch.innerHTML).to.equal('<div>foo</div>');

		name.update('bar');
		rerender();

		expect(scratch.innerHTML).to.equal('<div>bar</div>');
	});

	it('should unsubscribe to atoms', () => {
		const name = atom('foo');

		function App() {
			return <div>{$(name)}</div>;
		}

		render(<App />, scratch);
		expect(scratch.innerHTML).to.equal('<div>foo</div>');

		render(null, scratch);
		rerender();

		expect(name._unsubSpy).to.be.called;

		name.update('bar');
		rerender();

		expect(scratch.innerHTML).to.equal('');
	});

	it('should not trigger an update if value is the same', () => {
		const name = atom('foo');

		let count = 0;
		function App() {
			count++;
			return <div>{$(name)}</div>;
		}

		render(<App />, scratch);
		expect(scratch.innerHTML).to.equal('<div>foo</div>');
		expect(count).to.equal(1);

		name.update('foo');
		rerender();
		expect(count).to.equal(1);
	});

	describe('reactive components', () => {
		it('should only instantiate once', () => {
			let update;
			let count = 0;
			const App = component((_, get) => {
				const name = atom('foo');
				count++;
				update = name.update;
				return () => {
					return <div>{get(name)}</div>;
				};
			});

			render(<App />, scratch);
			expect(count).to.equal(1);
			expect(scratch.innerHTML).to.equal('<div>foo</div>');

			update('bar');
			rerender();
			expect(count).to.equal(1);
			expect(scratch.innerHTML).to.equal('<div>bar</div>');
		});

		it('should render', () => {
			// Triger subscription via get() call
			const App = component((_, get) => {
				const name = atom('foo');
				return () => <div>{get(name)}</div>;
			});

			render(<App />, scratch);
			expect(scratch.innerHTML).to.equal('<div>foo</div>');
		});

		it('should pass initial props', () => {
			const App = component((initProps, get) => {
				const name = atom(initProps.value || 'foo');
				return () => {
					return <div>{get(name)}</div>;
				};
			});

			render(<App value="bar" />, scratch);
			expect(scratch.innerHTML).to.equal('<div>bar</div>');
		});

		it('should unsubscribe from stale subscriptions', () => {
			let update;
			let updateFoo;

			let count = 0;
			const App = component((_, get) => {
				const num = atom(0);
				const foo = atom('foo');
				const bar = atom('bar');

				update = num.update;
				updateFoo = foo.update;

				return () => {
					count++;
					const v = get(num) % 2 === 0 ? get(foo) : get(bar);
					return <div>{v}</div>;
				};
			});

			render(<App />, scratch);
			expect(scratch.innerHTML).to.equal('<div>foo</div>');

			update(1);
			rerender();
			expect(count).to.equal(2);

			updateFoo('foo2');
			rerender();
			expect(count).to.equal(2);
			expect(scratch.innerHTML).to.equal('<div>bar</div>');
		});
	});
});
