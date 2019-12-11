import { createElement, render, Component } from 'preact';
import 'preact/debug';
import { setupScratch, teardown } from '../../../test/_util/helpers';

/** @jsx createElement */

describe('component stack', () => {
	/** @type {HTMLDivElement} */
	let scratch;

	let errors = [];
	let warnings = [];

	const getWarningStack = () => warnings[0].split('\n\n')[1];

	beforeEach(() => {
		scratch = setupScratch();

		errors = [];
		warnings = [];
		sinon.stub(console, 'error').callsFake(e => errors.push(e));
		sinon.stub(console, 'warn').callsFake(w => warnings.push(w));
	});

	afterEach(() => {
		console.error.restore();
		console.warn.restore();
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

		let lines = getWarningStack().split('\n');
		expect(lines[0].indexOf('Foo') > -1).to.equal(true);
		expect(lines[1].indexOf('Thrower') > -1).to.equal(true);
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
			constructor(props) {
				super(props);
				this.setState({ foo: 1 });
			}

			render() {
				return <div>foo</div>;
			}
		}

		render(<Bar />, scratch);

		let lines = getWarningStack().split('\n');
		expect(lines[0].indexOf('Bar') > -1).to.equal(true);
		expect(lines[1].indexOf('Foo') > -1).to.equal(true);
		expect(lines[2].indexOf('Thrower') > -1).to.equal(true);
	});
});
