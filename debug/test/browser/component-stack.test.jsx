import { createElement, render, Component, options } from 'preact';
import { useState } from 'preact/hooks';
import { setupRerender } from 'preact/test-utils';
import { captureOwnerStack, getCurrentVNode } from 'preact/debug';
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

	it('should print the component stack once for an error no boundary handles', async () => {
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
		await Promise.resolve();

		expect(errors).to.have.length(1);
		expect(errors[0]).to.match(/<Thrower> component/);
		let lines = getStack(errors).split('\n');
		expect(lines[0]).to.contain('Thrower');
		expect(lines[1]).to.contain('Foo');
	});

	it('should print the component stack for an error thrown after render', async () => {
		class Thrower extends Component {
			componentDidMount() {
				throw new Error('boom');
			}

			render() {
				return <div>foo</div>;
			}
		}

		expect(() => render(<Thrower />, scratch)).to.throw('boom');
		await Promise.resolve();

		expect(errors).to.have.length(1);
		expect(getStack(errors)).to.contain('Thrower');
	});

	it('should not keep components from a render that threw', async () => {
		function Thrower() {
			throw new Error('boom');
		}

		function Foo() {
			return <Thrower />;
		}

		expect(() => render(<Foo />, scratch)).to.throw('boom');
		expect(captureOwnerStack()).to.equal(null);

		await Promise.resolve();
		errors = [];
		class Bar extends Component {
			componentDidMount() {
				throw new Error('bar');
			}

			render() {
				return null;
			}
		}

		expect(() => render(<Bar />, scratch)).to.throw('bar');
		await Promise.resolve();
		expect(getStack(errors)).to.equal('  in Bar\n');
	});

	it('should not keep components below an error boundary that caught', () => {
		let siblingStack;

		function Thrower() {
			throw new Error('boom');
		}

		class Boundary extends Component {
			componentDidCatch() {
				this.setState({ error: true });
			}

			render() {
				return this.state.error ? null : <Thrower />;
			}
		}

		function Sibling() {
			siblingStack = captureOwnerStack();
			return null;
		}

		function App() {
			return (
				<div>
					<Boundary />
					<Sibling />
				</div>
			);
		}

		render(<App />, scratch);

		expect(siblingStack).to.equal('  in Sibling\n  in App\n');
		expect(captureOwnerStack()).to.equal(null);
	});

	it('should print the component stack every time the same error escapes', async () => {
		const error = new Error('cached');
		function Thrower() {
			throw error;
		}

		expect(() => render(<Thrower />, scratch)).to.throw(error);
		expect(() => render(<Thrower key="again" />, scratch)).to.throw(error);
		await Promise.resolve();

		expect(errors).to.have.length(2);
	});

	it('should only print the component stack once when a boundary rethrows', async () => {
		function Thrower() {
			throw new Error('boom');
		}

		function Foo() {
			return <Thrower />;
		}

		class Boundary extends Component {
			componentDidCatch(error) {
				throw new Error('wrapped: ' + error.message);
			}

			render() {
				return <Foo />;
			}
		}

		expect(() => render(<Boundary />, scratch)).to.throw(/wrapped/);
		await Promise.resolve();

		expect(errors).to.have.length(1);
	});

	it('should not print the component stack when an outer tree handles the error', async () => {
		const other = document.createElement('div');

		function Thrower() {
			throw new Error('inner');
		}

		class NestedRoot extends Component {
			componentDidMount() {
				render(<Thrower />, other);
			}

			render() {
				return null;
			}
		}

		class Boundary extends Component {
			componentDidCatch(error) {
				this.setState({ error });
			}

			render() {
				return this.state.error ? <p>caught</p> : <NestedRoot />;
			}
		}

		render(<Boundary />, scratch);
		await Promise.resolve();

		expect(errors.filter(e => typeof e == 'string')).to.deep.equal([]);
	});

	it('should name the component that suspended without a Suspense boundary', async () => {
		function Suspender() {
			throw new Promise(() => {});
		}

		function Foo() {
			return <Suspender />;
		}

		expect(() => render(<Foo />, scratch)).to.throw(/Missing Suspense/);
		await Promise.resolve();

		expect(errors).to.have.length(1);
		expect(errors[0]).to.match(/<Suspender> component/);
	});

	it('should name the component whose ref threw', async () => {
		function Foo() {
			return (
				<div
					ref={() => {
						throw new Error('ref');
					}}
				/>
			);
		}

		expect(() => render(<Foo />, scratch)).to.throw('ref');
		await Promise.resolve();

		expect(errors[0]).to.match(/<Foo> component/);
	});

	it('should not keep a component whose rerender threw', () => {
		const rerender = setupRerender();
		let setBroken;

		function Thrower({ broken }) {
			if (broken) throw new Error('boom');
			return null;
		}

		function Foo() {
			const [broken, set] = useState(false);
			setBroken = set;
			return <Thrower broken={broken} />;
		}

		render(<Foo />, scratch);
		setBroken(true);

		expect(() => rerender()).to.throw('boom');
		expect(captureOwnerStack()).to.equal(null);
	});

	it('should keep the stack of components being diffed when a removed one throws', () => {
		const rerender = setupRerender();
		const mismatches = [];
		let setChild, setShow;

		class Child extends Component {
			constructor() {
				super();
				setChild = value => this.setState({ value });
			}

			componentWillUnmount() {
				throw new Error('unmount');
			}

			render() {
				return <span />;
			}
		}

		function Leaf() {
			return <i />;
		}

		function Mid({ show }) {
			return (
				<div>
					{show && <Child />}
					<Leaf />
				</div>
			);
		}

		function Parent() {
			const [show, set] = useState(true);
			setShow = set;
			return <Mid show={show} />;
		}

		class Boundary extends Component {
			componentDidCatch() {
				this.setState({});
			}

			render() {
				return <Parent />;
			}
		}

		render(<Boundary />, scratch);
		// Records `Child` as diffed on its own, outside its parents.
		setChild(1);
		rerender();

		const oldDiffed = options.diffed;
		options.diffed = vnode => {
			if (typeof vnode.type == 'function' && getCurrentVNode() != vnode) {
				mismatches.push(vnode.type.name);
			}
			oldDiffed(vnode);
		};
		try {
			setShow(false);
			rerender();
		} finally {
			options.diffed = oldDiffed;
		}

		expect(mismatches).to.deep.equal([]);
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
