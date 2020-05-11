import { createElement, render, createRef, Component, Fragment } from 'preact';
import {
	setupScratch,
	teardown,
	serializeHtml
} from '../../../test/_util/helpers';
import './fakeDevTools';
import 'preact/debug';
import * as PropTypes from 'prop-types';

// eslint-disable-next-line no-duplicate-imports
import { resetPropWarnings } from 'preact/debug';

const h = createElement;
/** @jsx createElement */

describe('debug', () => {
	let scratch;
	let errors = [];
	let warnings = [];

	beforeEach(() => {
		errors = [];
		warnings = [];
		scratch = setupScratch();
		sinon.stub(console, 'error').callsFake(e => errors.push(e));
		sinon.stub(console, 'warn').callsFake(w => warnings.push(w));
	});

	afterEach(() => {
		/** @type {*} */
		(console.error).restore();
		console.warn.restore();
		teardown(scratch);
	});

	it('should initialize devtools', () => {
		expect(window.__PREACT_DEVTOOLS__.attachPreact).to.have.been.called;
	});

	it('should print an error on rendering on undefined parent', () => {
		let fn = () => render(<div />, undefined);
		expect(fn).to.throw(/render/);
	});

	it('should print an error on rendering on invalid parent', () => {
		let fn = () => render(<div />, 6);
		expect(fn).to.throw(/valid HTML node/);
		expect(fn).to.throw(/<div/);
	});

	it('should print an error with (function) component name when available', () => {
		const App = () => <div />;
		let fn = () => render(<App />, 6);
		expect(fn).to.throw(/<App/);
		expect(fn).to.throw(/6/);

		fn = () => render(<App />, {});
		expect(fn).to.throw(/<App/);
		expect(fn).to.throw(/[object Object]/);

		fn = () => render(<Fragment />, 'badroot');
		expect(fn).to.throw(/<Fragment/);
		expect(fn).to.throw(/badroot/);
	});

	it('should print an error with (class) component name when available', () => {
		class App extends Component {
			render() {
				return <div />;
			}
		}
		let fn = () => render(<App />, 6);
		expect(fn).to.throw(/<App/);
	});

	it('should print an error on undefined component', () => {
		let fn = () => render(h(undefined), scratch);
		expect(fn).to.throw(/createElement/);
	});

	it('should print an error on invalid object component', () => {
		let fn = () => render(h({}), scratch);
		expect(fn).to.throw(/createElement/);
	});

	it('should print an error when component is an array', () => {
		let fn = () => render(h([<div />]), scratch);
		expect(fn).to.throw(/createElement/);
	});

	it('should print an error on double jsx conversion', () => {
		let Foo = <div />;
		let fn = () => render(h(<Foo />), scratch);
		expect(fn).to.throw(/JSX twice/);
	});

	it('should add __source to the vnode in debug mode.', () => {
		const vnode = h('div', {
			__source: {
				fileName: 'div.jsx',
				lineNumber: 3
			}
		});
		expect(vnode.__source).to.deep.equal({
			fileName: 'div.jsx',
			lineNumber: 3
		});
		expect(vnode.props.__source).to.be.undefined;
	});

	it('should add __self to the vnode in debug mode.', () => {
		const vnode = h('div', {
			__self: {}
		});
		expect(vnode.__self).to.deep.equal({});
		expect(vnode.props.__self).to.be.undefined;
	});

	it('should warn when accessing certain attributes', () => {
		const vnode = h('div', null);
		vnode;
		vnode.attributes;
		expect(console.warn).to.be.calledOnce;
		expect(console.warn.args[0]).to.match(/use vnode.props/);
		vnode.nodeName;
		expect(console.warn).to.be.calledTwice;
		expect(console.warn.args[1]).to.match(/use vnode.type/);
		vnode.children;
		expect(console.warn).to.be.calledThrice;
		expect(console.warn.args[2]).to.match(/use vnode.props.children/);

		vnode.attributes = {};
		expect(console.warn.args[3]).to.match(/use vnode.props/);
		vnode.nodeName = '';
		expect(console.warn.args[4]).to.match(/use vnode.type/);
		vnode.children = [];
		expect(console.warn.args[5]).to.match(/use vnode.props.children/);
	});

	it('should warn when calling setState inside the constructor', () => {
		class Foo extends Component {
			constructor(props) {
				super(props);
				this.setState({ foo: true });
			}
			render() {
				return <div>foo</div>;
			}
		}

		render(<Foo />, scratch);
		expect(console.warn).to.be.calledOnce;
		expect(console.warn.args[0]).to.match(/no-op/);
	});

	it('should NOT warn when calling setState inside the cWM', () => {
		class Foo extends Component {
			componentWillMount() {
				this.setState({ foo: true });
			}
			render() {
				return <div>foo</div>;
			}
		}

		render(<Foo />, scratch);
		expect(console.warn).to.not.be.called;
	});

	it('should warn when calling setState on an unmounted Component', () => {
		let setState;

		class Foo extends Component {
			constructor(props) {
				super(props);
				setState = () => this.setState({ foo: true });
			}
			render() {
				return <div>foo</div>;
			}
		}

		render(<Foo />, scratch);
		expect(console.warn).to.not.be.called;

		render(null, scratch);

		setState();
		expect(console.warn).to.be.calledOnce;
		expect(console.warn.args[0]).to.match(/no-op/);
	});

	it('should warn when calling forceUpdate inside the constructor', () => {
		class Foo extends Component {
			constructor(props) {
				super(props);
				this.forceUpdate();
			}
			render() {
				return <div>foo</div>;
			}
		}

		render(<Foo />, scratch);
		expect(console.warn).to.be.calledOnce;
		expect(console.warn.args[0]).to.match(/no-op/);
	});

	it('should warn when calling forceUpdate on an unmounted Component', () => {
		let forceUpdate;

		class Foo extends Component {
			constructor(props) {
				super(props);
				forceUpdate = () => this.forceUpdate();
			}
			render() {
				return <div>foo</div>;
			}
		}

		render(<Foo />, scratch);
		forceUpdate();
		expect(console.warn).to.not.be.called;

		render(null, scratch);

		forceUpdate();
		expect(console.warn).to.be.calledOnce;
		expect(console.warn.args[0]).to.match(/no-op/);
	});

	it('should print an error when child is a plain object', () => {
		let fn = () => render(<div>{{}}</div>, scratch);
		expect(fn).to.throw(/not valid/);
	});

	it('should print an error on invalid refs', () => {
		let fn = () => render(<div ref="a" />, scratch);
		expect(fn).to.throw(/createRef/);
	});

	it('should not print for null as a handler', () => {
		let fn = () => render(<div onclick={null} />, scratch);
		expect(fn).not.to.throw();
	});

	it('should not print for undefined as a handler', () => {
		let fn = () => render(<div onclick={undefined} />, scratch);
		expect(fn).not.to.throw();
	});

	it('should not print for attributes starting with on for Components', () => {
		const Comp = () => <p>online</p>;
		let fn = () => render(<Comp online={false} />, scratch);
		expect(fn).not.to.throw();
	});

	it('should print an error on invalid handler', () => {
		let fn = () => render(<div onclick="a" />, scratch);
		expect(fn).to.throw(/"onclick" property should be a function/);
	});

	it('should NOT print an error on valid refs', () => {
		let noop = () => {};
		render(<div ref={noop} />, scratch);

		let ref = createRef();
		render(<div ref={ref} />, scratch);
		expect(console.error).to.not.be.called;
	});

	describe('duplicate keys', () => {
		const List = props => <ul>{props.children}</ul>;
		const ListItem = props => <li>{props.children}</li>;

		it('should print an error on duplicate keys with DOM nodes', () => {
			render(
				<div>
					<span key="a" />
					<span key="a" />
				</div>,
				scratch
			);
			expect(console.error).to.be.calledOnce;
		});

		it('should allow distinct object keys', () => {
			const A = { is: 'A' };
			const B = { is: 'B' };
			render(
				<div>
					<span key={A} />
					<span key={B} />
				</div>,
				scratch
			);
			expect(console.error).not.to.be.called;
		});

		it('should print an error for duplicate object keys', () => {
			const A = { is: 'A' };
			render(
				<div>
					<span key={A} />
					<span key={A} />
				</div>,
				scratch
			);
			expect(console.error).to.be.calledOnce;
		});

		it('should print an error on duplicate keys with Components', () => {
			function App() {
				return (
					<List>
						<ListItem key="a">a</ListItem>
						<ListItem key="b">b</ListItem>
						<ListItem key="b">d</ListItem>
						<ListItem key="d">d</ListItem>
					</List>
				);
			}

			render(<App />, scratch);
			expect(console.error).to.be.calledOnce;
		});

		it('should print an error on duplicate keys with Fragments', () => {
			function App() {
				return (
					<Fragment>
						<List key="list">
							<ListItem key="a">a</ListItem>
							<ListItem key="b">b</ListItem>
							<Fragment key="b">
								{/* Should be okay to duplicate keys since these are inside a Fragment */}
								<ListItem key="a">c</ListItem>
								<ListItem key="b">d</ListItem>
								<ListItem key="c">e</ListItem>
							</Fragment>
							<ListItem key="f">f</ListItem>
						</List>
						<div key="list">sibling</div>
					</Fragment>
				);
			}

			render(<App />, scratch);
			expect(console.error).to.be.calledTwice;
		});
	});

	describe('table markup', () => {
		it('missing <tbody>/<thead>/<tfoot>/<table>', () => {
			const Table = () => (
				<tr>
					<td>hi</td>
				</tr>
			);
			render(<Table />, scratch);
			expect(console.error).to.be.calledOnce;
		});

		it('missing <table> with <thead>', () => {
			const Table = () => (
				<thead>
					<tr>
						<td>hi</td>
					</tr>
				</thead>
			);
			render(<Table />, scratch);
			expect(console.error).to.be.calledOnce;
		});

		it('missing <table> with <tbody>', () => {
			const Table = () => (
				<tbody>
					<tr>
						<td>hi</td>
					</tr>
				</tbody>
			);
			render(<Table />, scratch);
			expect(console.error).to.be.calledOnce;
		});

		it('missing <table> with <tfoot>', () => {
			const Table = () => (
				<tfoot>
					<tr>
						<td>hi</td>
					</tr>
				</tfoot>
			);
			render(<Table />, scratch);
			expect(console.error).to.be.calledOnce;
		});

		it('missing <tr>', () => {
			const Table = () => (
				<table>
					<tbody>
						<td>Hi</td>
					</tbody>
				</table>
			);
			render(<Table />, scratch);
			expect(console.error).to.be.calledOnce;
		});

		it('missing <tr> with td component', () => {
			const Cell = ({ children }) => <td>{children}</td>;
			const Table = () => (
				<table>
					<tbody>
						<Cell>Hi</Cell>
					</tbody>
				</table>
			);
			render(<Table />, scratch);
			expect(console.error).to.be.calledOnce;
		});

		it('missing <tr> with th component', () => {
			const Cell = ({ children }) => <th>{children}</th>;
			const Table = () => (
				<table>
					<tbody>
						<Cell>Hi</Cell>
					</tbody>
				</table>
			);
			render(<Table />, scratch);
			expect(console.error).to.be.calledOnce;
		});

		it('Should accept <td> instead of <th> in <thead>', () => {
			const Table = () => (
				<table>
					<thead>
						<tr>
							<td>Hi</td>
						</tr>
					</thead>
				</table>
			);
			render(<Table />, scratch);
			expect(console.error).to.not.be.called;
		});

		it('Accepts well formed table with TD components', () => {
			const Cell = ({ children }) => <td>{children}</td>;
			const Table = () => (
				<table>
					<thead>
						<tr>
							<th>Head</th>
						</tr>
					</thead>
					<tbody>
						<tr>
							<td>Body</td>
						</tr>
					</tbody>
					<tfoot>
						<tr>
							<Cell>Body</Cell>
						</tr>
					</tfoot>
				</table>
			);
			render(<Table />, scratch);
			expect(console.error).to.not.be.called;
		});

		it('Accepts well formed table', () => {
			const Table = () => (
				<table>
					<thead>
						<tr>
							<th>Head</th>
						</tr>
					</thead>
					<tbody>
						<tr>
							<td>Body</td>
						</tr>
					</tbody>
					<tfoot>
						<tr>
							<td>Body</td>
						</tr>
					</tfoot>
				</table>
			);
			render(<Table />, scratch);
			expect(console.error).to.not.be.called;
		});

		it('Accepts minimal well formed table', () => {
			const Table = () => (
				<table>
					<tr>
						<th>Head</th>
					</tr>
					<tr>
						<td>Body</td>
					</tr>
				</table>
			);
			render(<Table />, scratch);
			expect(console.error).to.not.be.called;
		});
	});

	describe('PropTypes', () => {
		beforeEach(() => {
			resetPropWarnings();
		});

		it("should fail if props don't match prop-types", () => {
			function Foo(props) {
				return <h1>{props.text}</h1>;
			}

			Foo.propTypes = {
				text: PropTypes.string.isRequired
			};

			render(<Foo text={123} />, scratch);

			expect(console.error).to.be.calledOnce;

			// The message here may change when the "prop-types" library is updated,
			// but we check it exactly to make sure all parameters were supplied
			// correctly.
			expect(console.error).to.be.calledWith(
				'Failed prop type: Invalid prop `text` of type `number` supplied to `Foo`, expected `string`.'
			);
		});

		it('should only log a given prop type error once', () => {
			function Foo(props) {
				return <h1>{props.text}</h1>;
			}

			Foo.propTypes = {
				text: PropTypes.string.isRequired,
				count: PropTypes.number
			};

			// Trigger the same error twice. The error should only be logged
			// once.
			render(<Foo text={123} />, scratch);
			render(<Foo text={123} />, scratch);

			expect(console.error).to.be.calledOnce;

			// Trigger a different error. This should result in a new log
			// message.
			console.error.resetHistory();
			render(<Foo text="ok" count="123" />, scratch);
			expect(console.error).to.be.calledOnce;
		});

		it('should render with error logged when validator gets signal and throws exception', () => {
			function Baz(props) {
				return <h1>{props.unhappy}</h1>;
			}

			Baz.propTypes = {
				unhappy: function alwaysThrows(obj, key) {
					if (obj[key] === 'signal') throw Error('got prop');
				}
			};

			render(<Baz unhappy={'signal'} />, scratch);

			expect(console.error).to.be.calledOnce;
			expect(errors[0].includes('got prop')).to.equal(true);
			expect(serializeHtml(scratch)).to.equal('<h1>signal</h1>');
		});

		it('should not print to console when types are correct', () => {
			function Bar(props) {
				return <h1>{props.text}</h1>;
			}

			Bar.propTypes = {
				text: PropTypes.string.isRequired
			};

			render(<Bar text="foo" />, scratch);
			expect(console.error).to.not.be.called;
		});
	});
});
