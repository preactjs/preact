import {
	createElement,
	render,
	createRef,
	Component,
	Fragment,
	hydrate
} from 'preact';
import { useState } from 'preact/hooks';
import { setupScratch, teardown } from '../../../test/_util/helpers';
import './fakeDevTools';
import 'preact/debug';
import { setupRerender } from 'preact/test-utils';
import { vi } from 'vitest';

const h = createElement;

describe('debug', () => {
	/** @type {HTMLDivElement} */
	let scratch;
	let errors = [];
	let warnings = [];
	let rerender;

	beforeEach(() => {
		errors = [];
		warnings = [];
		scratch = setupScratch();
		rerender = setupRerender();
		vi.spyOn(console, 'error').mockImplementation(e => errors.push(e));
		vi.spyOn(console, 'warn').mockImplementation(w => warnings.push(w));
	});

	afterEach(() => {
		/** @type {*} */
		console.error.mockRestore();
		console.warn.mockRestore();
		teardown(scratch);
	});

	it('should initialize devtools', () => {
		expect(window.__PREACT_DEVTOOLS__.attachPreact).toHaveBeenCalled();
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

		// Push into an array to avoid empty statements being dead code eliminated
		const res = [];
		res.push(vnode);
		res.push(vnode.attributes);
		expect(console.warn).toHaveBeenCalledOnce();
		expect(console.warn.mock.calls[0]).to.match(/use vnode.props/);
		res.push(vnode.nodeName);
		expect(console.warn).toHaveBeenCalledTimes(2);
		expect(console.warn.mock.calls[1]).to.match(/use vnode.type/);
		res.push(vnode.children);
		expect(console.warn).toHaveBeenCalledTimes(3);
		expect(console.warn.mock.calls[2]).to.match(/use vnode.props.children/);

		// Should only warn once
		res.push(vnode.attributes);
		expect(console.warn).toHaveBeenCalledTimes(3);
		res.push(vnode.nodeName);
		expect(console.warn).toHaveBeenCalledTimes(3);
		res.push(vnode.children);
		expect(console.warn).toHaveBeenCalledTimes(3);

		vnode.attributes = {};
		expect(console.warn.mock.calls[3]).to.match(/use vnode.props/);
		vnode.nodeName = '';
		expect(console.warn.mock.calls[4]).to.match(/use vnode.type/);
		vnode.children = [];
		expect(console.warn.mock.calls[5]).to.match(/use vnode.props.children/);

		// Should only warn once
		vnode.attributes = {};
		expect(console.warn.mock.calls.length).to.equal(6);
		vnode.nodeName = '';
		expect(console.warn.mock.calls.length).to.equal(6);
		vnode.children = [];
		expect(console.warn.mock.calls.length).to.equal(6);

		// Mark res as used, otherwise it will be dead code eliminated
		expect(res.length).to.equal(7);
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
		expect(console.warn).toHaveBeenCalledOnce();
		expect(console.warn.mock.calls[0]).to.match(/no-op/);
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
		expect(console.warn).not.toHaveBeenCalled();
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
		expect(console.warn).toHaveBeenCalledOnce();
		expect(console.warn.mock.calls[0]).to.match(/no-op/);
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
		expect(console.warn).not.toHaveBeenCalled();

		render(null, scratch);

		forceUpdate();
		expect(console.warn).toHaveBeenCalledOnce();
		expect(console.warn.mock.calls[0]).to.match(/no-op/);
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
		expect(console.error).not.toHaveBeenCalled();
	});

	it('throws an error if a component rerenders too many times', () => {
		let rerenderCount = 0;
		function TestComponent({ loop = false }) {
			const [count, setCount] = useState(0);
			if (loop) {
				setCount(count + 1);
			}

			if (count > 30) {
				expect.fail(
					'Repeated rerenders did not cause the expected error. This test is failing.'
				);
			}

			rerenderCount += 1;
			return <div />;
		}

		expect(() => {
			render(
				<Fragment>
					<TestComponent />
					<TestComponent loop />
				</Fragment>,
				scratch
			);
		}).to.throw(/Too many re-renders/);
		// 1 for first TestComponent + 24 for second TestComponent
		expect(rerenderCount).to.equal(25);
	});

	it('does not throw an error if a component renders many times in different cycles', () => {
		let set;
		function TestComponent() {
			const [count, setCount] = useState(0);
			set = () => setCount(count + 1);
			return <div>{count}</div>;
		}

		render(<TestComponent />, scratch);
		for (let i = 0; i < 30; i++) {
			set();
			rerender();
		}
		expect(scratch.innerHTML).to.equal('<div>30</div>');
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
			expect(console.error).toHaveBeenCalledOnce();
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
			expect(console.error).not.toHaveBeenCalled();
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
			expect(console.error).toHaveBeenCalledOnce();
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
			expect(console.error).toHaveBeenCalledOnce();
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
			expect(console.error).toHaveBeenCalledTimes(2);
		});
	});

	describe('table markup', () => {
		it('missing <tbody>/<thead>/<tfoot>/<table>', () => {
			const Table = () => (
				<div>
					<tr>
						<td>hi</td>
					</tr>
				</div>
			);
			render(<Table />, scratch);
			expect(console.error).toHaveBeenCalledOnce();
		});

		it('missing <table> with <thead>', () => {
			const Table = () => (
				<div>
					<thead>
						<tr>
							<td>hi</td>
						</tr>
					</thead>
				</div>
			);
			render(<Table />, scratch);
			expect(console.error).toHaveBeenCalledOnce();
		});

		it('missing <table> with <tbody>', () => {
			const Table = () => (
				<div>
					<tbody>
						<tr>
							<td>hi</td>
						</tr>
					</tbody>
				</div>
			);
			render(<Table />, scratch);
			expect(console.error).toHaveBeenCalledOnce();
		});

		it('missing <table> with <tfoot>', () => {
			const Table = () => (
				<div>
					<tfoot>
						<tr>
							<td>hi</td>
						</tr>
					</tfoot>
				</div>
			);
			render(<Table />, scratch);
			expect(console.error).toHaveBeenCalledOnce();
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
			expect(console.error).toHaveBeenCalledOnce();
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
			expect(console.error).toHaveBeenCalledOnce();
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
			expect(console.error).toHaveBeenCalledOnce();
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
			expect(console.error).not.toHaveBeenCalled();
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
			expect(console.error).not.toHaveBeenCalled();
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
			expect(console.error).not.toHaveBeenCalled();
		});

		it('Accepts minimal well formed table', () => {
			const Table = () => (
				<table>
					<tbody>
						<tr>
							<th>Head</th>
						</tr>
						<tr>
							<td>Body</td>
						</tr>
					</tbody>
				</table>
			);
			render(<Table />, scratch);
			expect(console.error).not.toHaveBeenCalled();
		});

		it('should include DOM parents outside of root node', () => {
			const Table = () => (
				<tr>
					<td>Head</td>
				</tr>
			);

			const table = document.createElement('table');
			scratch.appendChild(table);
			render(<Table />, table);
			expect(console.error).not.toHaveBeenCalled();
		});

		it('should warn for improper nested table', () => {
			const Table = () => (
				<table>
					<tbody>
						<tr>
							<table />
						</tr>
					</tbody>
				</table>
			);

			render(<Table />, scratch);
			expect(console.error).toHaveBeenCalledOnce();
		});

		it('accepts valid nested tables', () => {
			const Table = () => (
				<table>
					<tbody>
						<tr>
							<th>foo</th>
						</tr>
						<tr>
							<td id="nested">
								<table>
									<tbody>
										<tr>
											<td>cell1</td>
											<td>cell2</td>
											<td>cell3</td>
										</tr>
									</tbody>
								</table>
							</td>
						</tr>
						<tr>
							<td>bar</td>
						</tr>
					</tbody>
				</table>
			);

			render(<Table />, scratch);
			expect(console.error).not.toHaveBeenCalled();
		});
	});

	describe('paragraph nesting', () => {
		it('should not warn a regular text paragraph', () => {
			const Paragraph = () => <p>Hello world</p>;

			render(<Paragraph />, scratch);
			expect(console.error).not.toHaveBeenCalled();
		});

		it('should not crash for an empty pragraph', () => {
			const Paragraph = () => <p />;

			render(<Paragraph />, scratch);
			expect(console.error).not.toHaveBeenCalled();
		});

		it('should warn for nesting illegal dom-nodes under a paragraph', () => {
			const Paragraph = () => (
				<p>
					<h1>Hello world</h1>
				</p>
			);

			render(<Paragraph />, scratch);
			expect(console.error).toHaveBeenCalledOnce();
		});

		it('should warn for nesting illegal dom-nodes under a paragraph with a parent', () => {
			const Paragraph = () => (
				<div>
					<p>
						<div>Hello world</div>
					</p>
				</div>
			);

			render(<Paragraph />, scratch);
			expect(console.error).toHaveBeenCalledOnce();
		});

		it('should warn for nesting illegal dom-nodes under a paragraph as func', () => {
			const Title = ({ children }) => <h1>{children}</h1>;
			const Paragraph = () => (
				<p>
					<Title>Hello world</Title>
				</p>
			);

			render(<Paragraph />, scratch);
			expect(console.error).toHaveBeenCalledOnce();
		});

		it('should not warn for nesting span under a paragraph', () => {
			const Paragraph = () => (
				<p>
					<span>Hello world</span>
				</p>
			);

			render(<Paragraph />, scratch);
			expect(console.error).not.toHaveBeenCalled();
		});
	});

	describe('button nesting', () => {
		it('should not warn on a regular button', () => {
			const Button = () => <button>Hello world</button>;

			render(<Button />, scratch);
			expect(console.error).not.toHaveBeenCalled();
		});

		it('should warn for nesting illegal dom-nodes under a button', () => {
			const Button = () => (
				<button>
					<button>Hello world</button>
				</button>
			);

			render(<Button />, scratch);
			expect(console.error).toHaveBeenCalledOnce();
		});

		it('should warn for nesting illegal dom-nodes under a button as func', () => {
			const ButtonChild = ({ children }) => <button>{children}</button>;
			const Button = () => (
				<button>
					<ButtonChild>Hello world</ButtonChild>
				</button>
			);

			render(<Button />, scratch);
			expect(console.error).toHaveBeenCalledOnce();
		});

		it('should not warn for nesting non-interactive content under a button', () => {
			const Button = () => (
				<button>
					<span>Hello </span>
					<a>World</a>
				</button>
			);

			render(<Button />, scratch);
			expect(console.error).not.toHaveBeenCalled();
		});
	});

	describe('anchor nesting', () => {
		it('should not warn a regular anchor', () => {
			const Anchor = () => <a>Hello world</a>;

			render(<Anchor />, scratch);
			expect(console.error).not.toHaveBeenCalled();
		});

		it('should warn for nesting illegal dom-nodes under an anchor', () => {
			const Anchor = () => (
				<a>
					<a>Hello world</a>
				</a>
			);

			render(<Anchor />, scratch);
			expect(console.error).toHaveBeenCalledOnce();
		});

		it('should warn for nesting illegal dom-nodes under an anchor as func', () => {
			const AnchorChild = ({ children }) => <a>{children}</a>;
			const Anchor = () => (
				<a>
					<AnchorChild>Hello world</AnchorChild>
				</a>
			);

			render(<Anchor />, scratch);
			expect(console.error).toHaveBeenCalledOnce();
		});

		it('should not warn for nesting non-interactive content under an anchor', () => {
			const Anchor = () => (
				<a>
					<span>Hello </span>
					<button>World</button>
				</a>
			);

			render(<Anchor />, scratch);
			expect(console.error).not.toHaveBeenCalled();
		});
	});

	describe('Hydration mismatches', () => {
		it('Should warn us for a node mismatch', () => {
			scratch.innerHTML = '<div><span>foo</span>/div>';
			const App = () => (
				<div>
					<p>foo</p>
				</div>
			);
			hydrate(<App />, scratch);
			expect(console.error).toHaveBeenCalledOnce();
			expect(console.error).toHaveBeenCalledWith(
				expect.objectContaining(
					/Expected a DOM node of type "p" but found "span"/
				)
			);
		});

		it('Should not warn for a text-node mismatch', () => {
			scratch.innerHTML = '<div>foo bar baz/div>';
			const App = () => (
				<div>
					foo {'bar'} {'baz'}
				</div>
			);
			hydrate(<App />, scratch);
			expect(console.error).not.toHaveBeenCalled();
		});

		it('Should not warn for a well-formed tree', () => {
			scratch.innerHTML = '<div><span>foo</span><span>bar</span></div>';
			const App = () => (
				<div>
					<span>foo</span>
					<span>bar</span>
				</div>
			);
			hydrate(<App />, scratch);
			expect(console.error).not.toHaveBeenCalled();
		});
	});
});
