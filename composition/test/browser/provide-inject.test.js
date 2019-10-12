/* eslint-disable react/display-name */
import { h, render, Component } from 'preact';
import { setupScratch, teardown } from '../../../test/_util/helpers';
import { createComponent, provide, inject, reactive } from '../../src';
import { nextFrame } from '../_util/nextFrame';

/** @jsx h */

describe('provide/inject', () => {

	/** @type {HTMLDivElement} */
	let scratch;

	beforeEach(() => {
		scratch = setupScratch();
	});

	afterEach(() => {
		teardown(scratch);
	});

	it('gets values from context', () => {
		const Provide = createComponent(() => {
			const ctx = reactive({ color: 'red' });
			provide('theme:color', ctx);
			return ({ children }) => children;
		});

		const Inject = createComponent(() => {
			const ctx = inject('theme:color');
			expect(ctx.color).to.equal('red');
			return () => null;
		});

		render(
			<Provide>
				<Inject />
			</Provide>,
			scratch
		);
	});

	it('should use default valuet', () => {
		const Provide = createComponent(() => ({ children }) => children);

		const Inject = createComponent(() => {
			const ctx = inject('theme:color', { color: 'blue' });
			expect(ctx.color).to.equal('blue');
			return () => null;
		});

		render(
			<Provide>
				<Inject />
			</Provide>,
			scratch
		);
	});

	it('should update children', async () => {
		let providedCtx;
		const Provide = createComponent(() => {
			providedCtx = reactive({ color: 'red' });
			provide('theme:color', providedCtx);
			return ({ children }) => children;
		});

		let injectedValue;
		const Inject = createComponent(() => {
			const ctx = inject('theme:color');
			return () => {
				injectedValue = ctx.color;
				return null;
			};
		});

		render(
			<Provide>
				<Inject />
			</Provide>,
			scratch
		);

		expect(injectedValue).to.equal('red');

		providedCtx.color = 'blue';

		await nextFrame();

		expect(injectedValue).to.equal('blue');
	});

	it('should update when value changes with nonUpdating Component on top', async () => {
		class NoUpdate extends Component {
			shouldComponentUpdate() {
				return false;
			}
			render() {
				return this.props.children;
			}
		}
		let providedCtx;
		const Provide = createComponent(() => {
			providedCtx = reactive({ color: 'red' });
			provide('theme:color', providedCtx);
			return ({ children }) => children;
		});

		let injectedValue;
		const Inject = createComponent(() => {
			const ctx = inject('theme:color');
			return () => {
				injectedValue = ctx.color;
				return null;
			};
		});

		render(
			<Provide>
				<NoUpdate>
					<Inject />
				</NoUpdate>
			</Provide>,
			scratch
		);

		expect(injectedValue).to.equal('red');

		providedCtx.color = 'blue';

		await nextFrame();

		expect(injectedValue).to.equal('blue');
	});

	it('provide simple values', async () => {
		const Provide = createComponent(() => {
			const theme = reactive({ color: 'red' });
			function change() {
				theme.color = 'blue';
			}
			provide('theme', theme);
			provide('theme:change', change);
			return ({ children }) => children;
		});

		const Inject = createComponent(() => {
			const theme = inject('theme');
			const change = inject('theme:change');

			return () => <button onClick={change}>{theme.color}</button>;
		});

		render(
			<Provide>
				<Inject />
			</Provide>,
			scratch
		);

		const btn = scratch.firstElementChild;
		expect(btn.textContent).to.equal('red');

		btn.click();
		await nextFrame();

		expect(btn.textContent).to.equal('blue');
	});
});
