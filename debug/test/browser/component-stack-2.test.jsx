import { createElement, render, Component } from 'preact';
import 'preact/debug';
import { setupScratch, teardown } from '../../../test/_util/helpers';
import { vi } from 'vitest';

// This test is not part of component-stack.test.js to avoid it being
// transpiled with '@babel/plugin-transform-react-jsx-source' enabled.

describe('component stack', () => {
	/** @type {HTMLDivElement} */
	let scratch;

	let errors = [];
	let warnings = [];

	beforeEach(() => {
		scratch = setupScratch();

		errors = [];
		warnings = [];
		vi.spyOn(console, 'error').mockImplementation(e => errors.push(e));
		vi.spyOn(console, 'warn').mockImplementation(w => warnings.push(w));
	});

	afterEach(() => {
		console.error.mockRestore();
		console.warn.mockRestore();
		teardown(scratch);
	});

	it('should print a warning when "@babel/plugin-transform-react-jsx-source" is not installed', () => {
		function Foo() {
			return <Thrower />;
		}

		class Thrower extends Component {
			constructor(props) {
				super(props);
				this.setState({ foo: 1 });
			}

			render() {
				return <div>foo</div>;
			}
		}

		render(<Foo />, scratch);

		expect(
			warnings[0].indexOf('@babel/plugin-transform-react-jsx-source') > -1
		).to.equal(true);
	});
});
