import { createRequire } from 'node:module';
import jscodeshift from 'jscodeshift';

const require = createRequire(import.meta.url);
const transform = require('./10-to-11.cjs');
const parser = jscodeshift.withParser('tsx');

function run(source, path = 'example.jsx') {
	const stats = [];
	const output = transform(
		{ path, source },
		{ jscodeshift, stats: name => stats.push(name) }
	);
	return { output, stats };
}

function comparableAst(source) {
	const program = parser(source).find(jscodeshift.Program).nodes()[0];
	return JSON.parse(
		JSON.stringify(program, (key, value) => {
			if (
				key === 'loc' ||
				key === 'start' ||
				key === 'end' ||
				key === 'tokens' ||
				key === 'extra'
			) {
				return undefined;
			}
			return value;
		})
	);
}

function expectCode(output, expected) {
	expect(comparableAst(output)).toEqual(comparableAst(expected));
}

describe('Preact 10 to 11 codemod', () => {
	it('migrates native runtime APIs and behavior', () => {
		const source = `
			import { render } from 'preact/dist/preact.module.js';
			import { createPortal, forwardRef, memo } from 'preact/compat';
			import { useRef } from 'preact/hooks';

			const Button = forwardRef((props, inputRef) => (
				<button ref={inputRef} style={{ height: 500, opacity: 0.5, marginTop: -2, '--gap': 2 }} {...props} />
			));
			const ref = useRef();
			render(<Button />, root, widget);
			export { createPortal as portal, memo } from 'preact/compat';
		`;

		const { output, stats } = run(source);
		expectCode(
			output,
			`
				import { render, createPortal } from 'preact';
				import { memo } from 'preact/compat';
				import { useRef } from 'preact/hooks';
				import { createRootFragment } from 'preact-root-fragment';

				const Button = ({ ref: inputRef, ...props }) => (
					<button ref={inputRef} style={{ height: '500px', opacity: 0.5, marginTop: '-2px', '--gap': 2 }} {...props} />
				);
				const ref = useRef(undefined);
				render(<Button />, createRootFragment(root, widget));
				export { memo } from 'preact/compat';
				export { createPortal as portal } from 'preact';
			`
		);
		expect(stats).toEqual([]);
		expect(run(output).output).toBe(output);
	});

	it('preserves TypeScript props and migrates removed JSX utility types', () => {
		const source = `
			import type { JSX } from 'preact';
			import { forwardRef as withRef } from 'preact/compat';

			type InputProps = JSX.InputHTMLAttributes<HTMLInputElement> & { label: string };
			type ButtonHTMLAttributes = { local: true };
			type ButtonProps = JSX.ButtonHTMLAttributes<HTMLButtonElement>;

			export const Input = withRef<HTMLInputElement, InputProps>((props, inputRef) => (
				<input ref={inputRef} aria-label={props.label} />
			));
		`;

		const { output, stats } = run(source, 'example.tsx');
		expectCode(
			output,
			`
				import type {
					RenderableProps,
					InputHTMLAttributes,
					ButtonHTMLAttributes as PreactButtonHTMLAttributes
				} from 'preact';

				type InputProps = InputHTMLAttributes<HTMLInputElement> & { label: string };
				type ButtonHTMLAttributes = { local: true };
				type ButtonProps = PreactButtonHTMLAttributes<HTMLButtonElement>;

				export const Input = ({ ref: inputRef, ...props }: RenderableProps<InputProps, HTMLInputElement>) => (
					<input ref={inputRef} aria-label={props.label} />
				);
			`
		);
		expect(stats).toEqual([]);
		expect(run(output, 'example.tsx').output).toBe(output);
	});

	it('leaves complex and shadowed calls alone', () => {
		const source = `
			import { forwardRef, useRef } from 'preact/compat';

			const Named = forwardRef(renderInput);
			const Complex = forwardRef(({ value, ...props }) => <input value={value} {...props} />);
			const UsesArguments = forwardRef(function Input(props, ref) {
				return <input ref={arguments[1]} {...props} />;
			});
			const ref = useRef();

			function local(forwardRef, useRef) {
				return [forwardRef((props, ref) => null), useRef()];
			}
		`;

		const { output, stats } = run(source);
		expectCode(
			output,
			`
				import { forwardRef, useRef } from 'preact/compat';

				const Named = forwardRef(renderInput);
				const Complex = forwardRef(({ value, ...props }) => <input value={value} {...props} />);
				const UsesArguments = forwardRef(function Input(props, ref) {
					return <input ref={arguments[1]} {...props} />;
				});
				const ref = useRef(undefined);

				function local(forwardRef, useRef) {
					return [forwardRef((props, ref) => null), useRef()];
				}
			`
		);
		expect(stats).toEqual([
			'manual review: non-inline forwardRef',
			'manual review: complex forwardRef parameters',
			'manual review: complex forwardRef parameters'
		]);
	});

	it('parses Flow while leaving typed forwardRef callbacks for review', () => {
		const source = `
			import { forwardRef, useRef } from 'preact/compat';

			type Props = {| value: string |};
			const Input = forwardRef((props: Props, ref) => <input ref={ref} value={props.value} />);
			const ref = useRef();
		`;

		const { output, stats } = run(source, 'example.jsx');
		expect(output).toContain(
			'forwardRef((props: Props, ref) => <input ref={ref} value={props.value} />)'
		);
		expect(output).toContain('useRef(undefined)');
		expect(stats).toEqual(['manual review: complex forwardRef parameters']);
		expect(run(output, 'example.jsx').output).toBe(output);
	});

	it('migrates direct distribution paths without removing side-effect imports', () => {
		const source = `
			'use client';
			import 'preact/debug';
			export * from 'preact/hooks/dist/hooks.module.js';
			const debug = import('preact/debug/dist/debug.module.js');
			const compat = require('preact/compat/dist/compat.js');
			function customLoader(require) {
				return require('preact/dist/preact.js');
			}
		`;

		const { output, stats } = run(source, 'example.js');
		expectCode(
			output,
			`
				'use client';
				import 'preact/debug';
				export * from 'preact/hooks';
				const debug = import('preact/debug');
				const compat = require('preact/compat');
				function customLoader(require) {
					return require('preact/dist/preact.js');
				}
			`
		);
		expect(stats).toEqual(['manual review: CommonJS import']);
		expect(output).not.toContain(';;');
	});

	it('reports upgrade steps that require manual decisions', () => {
		const source = `
			import { Component } from 'preact';
			import { SuspenseList } from 'preact/compat';

			function App() {}
			App.defaultProps = { label: 'Default' };

			class Legacy extends Component {
				get element() {
					return this.base;
				}
			}
		`;

		const { output, stats } = run(source);
		expectCode(output, source);
		expect(stats).toEqual([
			'manual review: defaultProps',
			'manual review: Component.base',
			'manual review: SuspenseList'
		]);
	});
});
