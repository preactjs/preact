import { createElement, render, Component } from 'preact';
import { captureOwnerStack } from 'preact/debug';
import { vi } from 'vitest';
import { setupScratch, teardown } from '../../../test/_util/helpers';

describe('component stack', () => {
	/** @type {HTMLDivElement} */
	let scratch;

	let errors = [];
	let warnings = [];

	const getStack = arr => arr[0].split('\n\n')[1];

	beforeEach(() => {
		scratch = setupScratch();

		errors = [];
		warnings = [];
		vi.spyOn(console, 'error').mockImplementation(e => errors.push(e));
		vi.spyOn(console, 'warn').mockImplementation(w => warnings.push(w));
	});

	afterEach(() => {
		vi.resetAllMocks();
		teardown(scratch);
	});

	it('should print component stack', () => {
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

		// This has a JSX transform warning, so we need to remove it
		warnings.shift();
		let lines = getStack(warnings).split('\n');
		expect(lines[0].indexOf('Thrower') > -1).to.equal(true);
		expect(lines[1].indexOf('Foo') > -1).to.equal(true);
	});

	it('should only print owners', () => {
		function Foo(props) {
			return <div>{props.children}</div>;
		}

		function Bar() {
			return (
				<Foo>
					<Thrower />
				</Foo>
			);
		}

		class Thrower extends Component {
			render() {
				return (
					<table>
						<td>
							<tr>foo</tr>
						</td>
					</table>
				);
			}
		}

		render(<Bar />, scratch);

		let lines = getStack(errors).split('\n');
		expect(lines[0].indexOf('tr') > -1).to.equal(true);
		expect(lines[1].indexOf('Thrower') > -1).to.equal(true);
		expect(lines[2].indexOf('Bar') > -1).to.equal(true);
	});

	it('should capture the owner stack during render and return null otherwise', () => {
		let capturedStack;

		function Child() {
			capturedStack = captureOwnerStack();
			return null;
		}

		function Parent() {
			return <Child />;
		}

		expect(captureOwnerStack()).to.equal(null);
		render(<Parent />, scratch);
		expect(capturedStack).to.match(/in Child[\s\S]*in Parent/);
		expect(captureOwnerStack()).to.equal(null);
	});

	it('should print the component stack once for an error no boundary handles', () => {
		const error = new Error('boom');
		function Thrower() {
			throw error;
		}

		function Foo() {
			return (
				<div>
					<Thrower />
				</div>
			);
		}

		expect(() => render(<Foo />, scratch)).to.throw(error);

		expect(errors).to.have.length(1);
		expect(errors[0]).to.match(/<Thrower> component/);
		let lines = getStack(errors).split('\n');
		expect(lines[0]).to.contain('Thrower');
		expect(lines[1]).to.contain('Foo');
	});

	it('should print the component stack for an error thrown after render', () => {
		class Thrower extends Component {
			componentDidMount() {
				throw new Error('boom');
			}

			render() {
				return <div>foo</div>;
			}
		}

		expect(() => render(<Thrower />, scratch)).to.throw('boom');

		expect(errors).to.have.length(1);
		expect(getStack(errors)).to.contain('Thrower');
	});

	it('should not print a warning when "@babel/plugin-transform-react-jsx-source" is installed', () => {
		function Thrower() {
			throw new Error('foo');
		}

		try {
			render(<Thrower />, scratch);
		} catch {}

		expect(warnings.join(' ')).to.not.include(
			'@babel/plugin-transform-react-jsx-source'
		);
	});
});
