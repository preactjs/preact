import { createElement, render, createStatic } from 'preact';
import { setupScratch, teardown } from '../_util/helpers';

/** @jsx createElement */

describe('Static', () => {
	/** @type {HTMLDivElement} */
	let scratch;

	beforeEach(() => {
		scratch = setupScratch();
	});

	afterEach(() => {
		teardown(scratch);
	});

	it('should mount', () => {
		const Foo = createStatic(() => {
			const el = document.createElement('h1');
			el.textContent = 'it works!';
			return el;
		});

		render(<Foo />, scratch);
		expect(scratch.innerHTML).to.equal('<h1>it works!</h1>');
	});

	it('should unmount', () => {
		const Foo = createStatic(() => {
			const el = document.createElement('h1');
			el.textContent = 'it works!';
			return el;
		});

		render(<Foo />, scratch);
		render(null, scratch);
		expect(scratch.innerHTML).to.equal('');
	});

	it('should bypass update', () => {
		const spy = sinon.spy(() => {
			const el = document.createElement('h1');
			el.textContent = 'it works!';
			return el;
		});
		const Foo = createStatic(spy);

		/** @type {(props: {v?:number})=>any} */
		function App(props) {
			return <Foo />;
		}

		render(<App v={1} />, scratch);
		render(<App v={2} />, scratch);

		expect(scratch.innerHTML).to.equal('<h1>it works!</h1>');
		expect(spy).to.be.calledOnce;
	});

	describe('multiple children', () => {
		it('should mount', () => {
			const Foo = createStatic(() => {
				const a = document.createElement('p');
				const b = document.createElement('p');
				a.textContent = 'A';
				b.textContent = 'B';
				return [a, b];
			});

			render(<Foo />, scratch);
			expect(scratch.innerHTML).to.equal('<p>A</p><p>B</p>');
		});

		it('should unmount', () => {
			const Foo = createStatic(() => {
				const a = document.createElement('p');
				const b = document.createElement('p');
				a.textContent = 'A';
				b.textContent = 'B';
				return [a, b];
			});

			render(<Foo />, scratch);
			render(null, scratch);
			expect(scratch.innerHTML).to.equal('');
		});
	});
});
