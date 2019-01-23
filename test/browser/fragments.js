import { createElement as h, render, Component, Fragment } from '../../src/index';
import { setupScratch, teardown, setupRerender } from '../_util/helpers';
import { span, div } from '../_util/dom';

/** @jsx h */
/* eslint-disable react/jsx-boolean-value */

describe('Fragment', () => {

	/** @type {HTMLDivElement} */
	let scratch;

	/** @type {() => void} */
	let rerender;

	let ops = [];

	class Stateful extends Component {
		componentDidUpdate() {
			ops.push('Update Stateful');
		}
		render() {
			return <div>Hello</div>;
		}
	}

	beforeEach(() => {
		scratch = setupScratch();
		rerender = setupRerender();
		ops = [];
	});

	afterEach(() => {
		teardown(scratch);
	});

	it('should not render empty Fragment', () => {
		render(<Fragment />, scratch);
		expect(scratch.innerHTML).to.equal('');
	});

	it('should render a single child', () => {
		render((
			<Fragment>
				<span>foo</span>
			</Fragment>
		), scratch);

		expect(scratch.innerHTML).to.equal('<span>foo</span>');
	});

	it('should render multiple children via noop renderer', () => {
		render((
			<Fragment>
				hello <span>world</span>
			</Fragment>
		), scratch);

		expect(scratch.innerHTML).to.equal('hello <span>world</span>');
	});

	it.skip('should preserve state of children with 1 level nesting', () => {
		function Foo({ condition }) {
			return condition ? (
				<Stateful key="a" />
			) : (
				<Fragment>
					<Stateful key="a" />
					<div key="b">World</div>
				</Fragment>
			);
		}

		render(<Foo condition={true} />, scratch);
		render(<Foo condition={false} />, scratch);

		expect(ops).to.deep.equal(['Update Stateful']);
		expect(scratch.innerHTML).to.deep.equal('<div>Hello</div><div>World</div>');

		render(<Foo condition={true} />, scratch);

		expect(ops).to.deep.equal(['Update Stateful', 'Update Stateful']);
		expect(scratch.innerHTML).to.deep.equal('<div>Hello</div>');
	});

	it('should preserve state between top-level fragments', () => {
		function Foo({ condition }) {
			return condition ? (
				<Fragment>
					<Stateful />
				</Fragment>
			) : (
				<Fragment>
					<Stateful />
				</Fragment>
			);
		}

		render(<Foo condition={true} />, scratch);
		render(<Foo condition={false} />, scratch);

		expect(ops).to.deep.equal(['Update Stateful']);
		expect(scratch.innerHTML).to.equal('<div>Hello</div>');

		render(<Foo condition={true} />, scratch);

		expect(ops).to.deep.equal(['Update Stateful', 'Update Stateful']);
		expect(scratch.innerHTML).to.equal('<div>Hello</div>');
	});

	it('should preserve state of children nested at same level', () => {
		function Foo({ condition }) {
			return condition ? (
				<Fragment>
					<Fragment>
						<Fragment>
							<Stateful key="a" />
						</Fragment>
					</Fragment>
				</Fragment>
			) : (
				<Fragment>
					<Fragment>
						<Fragment>
							<div />
							<Stateful key="a" />
						</Fragment>
					</Fragment>
				</Fragment>
			);
		}

		render(<Foo condition={true} />, scratch);
		render(<Foo condition={false} />, scratch);

		expect(ops).to.deep.equal(['Update Stateful']);
		expect(scratch.innerHTML).to.equal('<div></div><div>Hello</div>');

		render(<Foo condition={true} />, scratch);

		expect(ops).to.deep.equal(['Update Stateful', 'Update Stateful']);
		expect(scratch.innerHTML).to.equal('<div>Hello</div>');
	});

	it('should not preserve state in non-top-level fragment nesting', () => {
		function Foo({ condition }) {
			return condition ? (
				<Fragment>
					<Fragment>
						<Stateful key="a" />
					</Fragment>
				</Fragment>
			) : (
				<Fragment>
					<Stateful key="a" />
				</Fragment>
			);
		}

		render(<Foo condition={true} />, scratch);
		render(<Foo condition={false} />, scratch);

		expect(ops).to.deep.equal([]);
		expect(scratch.innerHTML).to.equal('<div>Hello</div>');

		render(<Foo condition={true} />, scratch);

		expect(ops).to.deep.equal([]);
		expect(scratch.innerHTML).to.equal('<div>Hello</div>');
	});

	it('should not preserve state of children if nested 2 levels without siblings', () => {
		function Foo({ condition }) {
			return condition ? (
				<Stateful key="a" />
			) : (
				<Fragment>
					<Fragment>
						<Stateful key="a" />
					</Fragment>
				</Fragment>
			);
		}

		render(<Foo condition={true} />, scratch);
		render(<Foo condition={false} />, scratch);

		expect(ops).to.deep.equal([]);
		expect(scratch.innerHTML).to.equal('<div>Hello</div>');

		render(<Foo condition={true} />, scratch);

		expect(ops).to.deep.equal([]);
		expect(scratch.innerHTML).to.equal('<div>Hello</div>');
	});

	it('should just render children for fragments', () => {
		class Comp extends Component {
			render() {
				return (
					<Fragment>
						<div>Child1</div>
						<div>Child2</div>
					</Fragment>
				);
			}
		}

		render(<Comp />, scratch);
		expect(scratch.innerHTML).to.equal('<div>Child1</div><div>Child2</div>');
	});

	it('should not preserve state of children if nested 2 levels with siblings', () => {
		function Foo({ condition }) {
			return condition ? (
				<Stateful key="a" />
			) : (
				<Fragment>
					<Fragment>
						<Stateful key="a" />
					</Fragment>
					<div />
				</Fragment>
			);
		}

		render(<Foo condition={true} />, scratch);
		render(<Foo condition={false} />, scratch);

		expect(ops).to.deep.equal([]);
		expect(scratch.innerHTML).to.equal('<div>Hello</div><div></div>');

		render(<Foo condition={true} />, scratch);

		expect(ops).to.deep.equal([]);
		expect(scratch.innerHTML).to.equal('<div>Hello</div>');
	});

	it('should preserve state between array nested in fragment and fragment', () => {
		// In this test case, the children of the Fragment in Foo end up being the same when flatened.
		//
		// When condition == true, the children of the Fragment are a Stateful VNode.
		// When condition == false, the children of the Fragment are an Array containing a single
		// Stateful VNode.
		//
		// However, when each of these are flattened (in flattenChildren), they both become
		// an Array containing a single Stateful VNode. So when diff'ed they are compared together
		// and the state of Stateful is preserved

		function Foo({ condition }) {
			return condition ? (
				<Fragment>
					<Stateful key="a" />
				</Fragment>
			) : (
				<Fragment>{[<Stateful key="a" />]}</Fragment>
			);
		}

		render(<Foo condition={true} />, scratch);
		render(<Foo condition={false} />, scratch);

		expect(ops).to.deep.equal(['Update Stateful']);
		expect(scratch.innerHTML).to.equal('<div>Hello</div>');

		render(<Foo condition={true} />, scratch);

		expect(ops).to.deep.equal(['Update Stateful', 'Update Stateful']);
		expect(scratch.innerHTML).to.equal('<div>Hello</div>');
	});

	it('should preserve state between top level fragment and array', () => {
		function Foo({ condition }) {
			return condition ? (
				[<Stateful key="a" />]
			) : (
				<Fragment>
					<Stateful key="a" />
				</Fragment>
			);
		}

		render(<Foo condition={true} />, scratch);
		// TODO: With this test, the Fragment with just one child will invoke
		// node.appendChild on a DOM element that is already appened to the `node`.
		// I think we need the oldParentVNode to get the old first DOM child to
		// effectively diff the children, because the parentVNode (the Fragment)
		// comes from the newTree and so won't ever have ._dom set before diffing
		// children.
		render(<Foo condition={false} />, scratch);

		expect(ops).to.deep.equal(['Update Stateful']);
		expect(scratch.innerHTML).to.equal('<div>Hello</div>');

		render(<Foo condition={true} />, scratch);

		expect(ops).to.deep.equal(['Update Stateful', 'Update Stateful']);
		expect(scratch.innerHTML).to.equal('<div>Hello</div>');
	});

	it('should not preserve state between array nested in fragment and double nested fragment', () => {
		// In this test case, the children of the Fragment in Foo end up being the different when flatened.
		//
		// When condition == true, the children of the Fragment are an Array of Stateful VNode.
		// When condition == false, the children of the Fragment are another Fragment whose children are
		// a single Stateful VNode.
		//
		// When each of these are flattened (in flattenChildren), the first Fragment stays the same
		// (Fragment -> [Stateful]). The second Fragment also doesn't change (flatenning doesn't erase
		// Fragments) so it remains Fragment -> Fragment -> Stateful. Therefore when diff'ed these Fragments
		// separate the two Stateful VNodes into different trees and state is not preserved between them.

		function Foo({ condition }) {
			return condition ? (
				<Fragment>{[<Stateful key="a" />]}</Fragment>
			) : (
				<Fragment>
					<Fragment>
						<Stateful key="a" />
					</Fragment>
				</Fragment>
			);
		}

		render(<Foo condition={true} />, scratch);
		render(<Foo condition={false} />, scratch);

		expect(ops).to.deep.equal([]);
		expect(scratch.innerHTML).to.equal('<div>Hello</div>');

		render(<Foo condition={true} />, scratch);

		expect(ops).to.deep.equal([]);
		expect(scratch.innerHTML).to.equal('<div>Hello</div>');
	});

	it.skip('should not preserve state between array nested in fragment and double nested array', () => {
		function Foo({ condition }) {
			return condition ? (
				<Fragment>{[<Stateful key="a" />]}</Fragment>
			) : (
				[[<Stateful key="a" />]]
			);
		}

		render(<Foo condition={true} />, scratch);
		render(<Foo condition={false} />, scratch);

		expect(ops).to.deep.equal([]);
		expect(scratch.innerHTML).to.equal('<div>Hello</div>');

		render(<Foo condition={true} />, scratch);

		expect(ops).to.deep.equal([]);
		expect(scratch.innerHTML).to.equal('<div>Hello</div>');
	});

	it.skip('should preserve state between double nested fragment and double nested array', () => {
		function Foo({ condition }) {
			return condition ? (
				<Fragment>
					<Fragment>
						<Stateful key="a" />
					</Fragment>
				</Fragment>
			) : (
				[[<Stateful key="a" />]]
			);
		}

		render(<Foo condition={true} />, scratch);
		render(<Foo condition={false} />, scratch);

		expect(ops).to.deep.equal(['Update Stateful']);
		expect(scratch.innerHTML).to.equal('<div>Hello</div>');

		render(<Foo condition={true} />, scratch);

		expect(ops).to.deep.equal(['Update Stateful', 'Update Stateful']);
		expect(scratch.innerHTML).to.equal('<div>Hello</div>');
	});

	it.skip('should not preserve state of children when the keys are different', () => {
		function Foo({ condition }) {
			return condition ? (
				<Fragment key="a">
					<Stateful />
				</Fragment>
			) : (
				<Fragment key="b">
					<Stateful />
					<span>World</span>
				</Fragment>
			);
		}

		render(<Foo condition={true} />, scratch);
		render(<Foo condition={false} />, scratch);

		expect(ops).to.deep.equal([]);
		expect(scratch.innerHTML).to.equal('<div>Hello</div><span>World</span>');

		render(<Foo condition={true} />, scratch);

		expect(ops).to.deep.equal([]);
		expect(scratch.innerHTML).to.equal('<div>Hello</div>');
	});

	it.skip('should not preserve state between unkeyed and keyed fragment', () => {
		function Foo({ condition }) {
			return condition ? (
				<Fragment key="a">
					<Stateful />
				</Fragment>
			) : (
				<Fragment>
					<Stateful />
				</Fragment>
			);
		}

		// React & Preact: has the same behavior for components
		// https://codesandbox.io/s/57prmy5mx
		render(<Foo condition={true} />, scratch);
		render(<Foo condition={false} />, scratch);

		expect(ops).to.deep.equal([]);
		expect(scratch.innerHTML).to.equal('<div>Hello</div>');

		render(<Foo condition={true} />, scratch);

		expect(ops).to.deep.equal([]);
		expect(scratch.innerHTML).to.equal('<div>Hello</div>');
	});

	it('should preserve state with reordering in multiple levels', () => {
		function Foo({ condition }) {
			return condition ? (
				<div>
					<Fragment key="c">
						<span>foo</span>
						<div key="b">
							<Stateful key="a" />
						</div>
					</Fragment>
					<span>boop</span>
				</div>
			) : (
				<div>
					<span>beep</span>
					<Fragment key="c">
						<div key="b">
							<Stateful key="a" />
						</div>
						<span>bar</span>
					</Fragment>
				</div>
			);
		}

		render(<Foo condition={true} />, scratch);
		render(<Foo condition={false} />, scratch);

		expect(ops).to.deep.equal(['Update Stateful']);
		expect(scratch.innerHTML).to.equal('<div><span>beep</span><div><div>Hello</div></div><span>bar</span></div>');

		render(<Foo condition={true} />, scratch);

		expect(ops).to.deep.equal(['Update Stateful', 'Update Stateful']);
		expect(scratch.innerHTML).to.equal('<div><span>foo</span><div><div>Hello</div></div><span>boop</span></div>');
	});

	it('should not preserve state when switching to a keyed fragment to an array', () => {
		function Foo({ condition }) {
			return condition ? (
				<div>
					{
						<Fragment key="foo">
							<Stateful />
						</Fragment>
					}
					<span />
				</div>
			) : (
				<div>
					{[<Stateful />]}
					<span />
				</div>
			);
		}

		render(<Foo condition={true} />, scratch);
		render(<Foo condition={false} />,  scratch);

		expect(ops).to.deep.equal([]);
		expect(scratch.innerHTML).to.equal('<div><div>Hello</div><span></span></div>');

		render(<Foo condition={true} />, scratch);

		expect(ops).to.deep.equal([]);
		expect(scratch.innerHTML).to.equal('<div><div>Hello</div><span></span></div>');
	});

	it('should preserve state when it does not change positions', () => {
		function Foo({ condition }) {
			return condition
				? [
					<span />,
					<Fragment>
						<Stateful />
					</Fragment>
				]
				: [
					<span />,
					<Fragment>
						<Stateful />
					</Fragment>
				];
		}

		render(<Foo condition={true} />, scratch);
		render(<Foo condition={false} />, scratch);

		expect(ops).to.deep.equal(['Update Stateful']);
		expect(scratch.innerHTML).to.equal('<span></span><div>Hello</div>');

		render(<Foo condition={true} />, scratch);

		expect(ops).to.deep.equal(['Update Stateful', 'Update Stateful']);
		expect(scratch.innerHTML).to.equal('<span></span><div>Hello</div>');
	});

	it('should render nested Fragments', () => {
		render((
			<Fragment>
				spam
				<Fragment>foo</Fragment>
				<Fragment />
				bar
			</Fragment>
		), scratch);
		expect(scratch.innerHTML).to.equal('spamfoobar');

		render((
			<Fragment>
				<Fragment>foo</Fragment>
				<Fragment>bar</Fragment>
			</Fragment>
		), scratch);
		expect(scratch.innerHTML).to.equal('foobar');
	});

	it('should respect keyed Fragments', () => {

		/** @type {() => void} */
		let update;

		class Comp extends Component {

			constructor() {
				super();
				this.state = { key: 'foo' };
				update = () => this.setState({ key: 'bar' });
			}

			render() {
				return <Fragment key={this.state.key}>foo</Fragment>;
			}
		}
		render(<Comp />, scratch);
		expect(scratch.innerHTML).to.equal('foo');

		update();
		rerender();

		expect(scratch.innerHTML).to.equal('foo');
	});

	it('should support conditionally rendered children', () => {

		/** @type {() => void} */
		let update;

		class Comp extends Component {

			constructor() {
				super();
				this.state = { value: true };
				update = () => this.setState({ value: !this.state.value });
			}

			render() {
				return (
					<Fragment>
						{this.state.value && 'foo'}
					</Fragment>
				);
			}
		}

		render(<Comp />, scratch);
		expect(scratch.innerHTML).to.equal('foo');

		update();
		rerender();

		expect(scratch.innerHTML).to.equal('');

		update();
		rerender();
		expect(scratch.innerHTML).to.equal('foo');
	});

	it('can modify the children of a Fragment', () => {

		/** @type {() => void} */
		let push;

		class List extends Component {
			constructor() {
				super();
				this.state = { values: [0, 1, 2] };
				push = () =>
					this.setState({
						values: [...this.state.values, this.state.values.length]
					});
			}

			render() {
				return (
					<Fragment>
						{this.state.values.map(value => (
							<div>{value}</div>
						))}
					</Fragment>
				);
			}
		}

		render(<List />, scratch);
		expect(scratch.textContent).to.equal('012');

		push();
		rerender();

		expect(scratch.textContent).to.equal('0123');

		push();
		rerender();

		expect(scratch.textContent).to.equal('01234');
	});

	it('should render sibling array children', () => {
		const Group = ({ title, values }) => (
			<Fragment>
				<li class="divider">{title}</li>
				{values.map(value => <li>{value}</li>)}
			</Fragment>
		);

		const Todo = () => (
			<ul>
				<Group title={'A header'} values={['a', 'b']} />
				<Group title={'A divider'} values={['c', 'd']} />
				<li>A footer</li>
			</ul>
		);

		render(<Todo />, scratch);

		let ul = scratch.firstChild;
		expect(ul.childNodes.length).to.equal(7);
		expect(ul.childNodes[0].textContent).to.equal('A header');
		expect(ul.childNodes[1].textContent).to.equal('a');
		expect(ul.childNodes[2].textContent).to.equal('b');
		expect(ul.childNodes[3].textContent).to.equal('A divider');
		expect(ul.childNodes[4].textContent).to.equal('c');
		expect(ul.childNodes[5].textContent).to.equal('d');
		expect(ul.childNodes[6].textContent).to.equal('A footer');
	});

	it('should reorder Fragment children', () => {
		let updateState;

		class App extends Component {
			constructor() {
				super();
				this.state = { active: false };
				updateState = () => this.setState(prev => ({ active: !prev.active }));
			}

			render() {
				return (
					<div>
						<h1>Heading</h1>
						{!this.state.active ? (
							<Fragment>
								foobar
								<Fragment>
									Hello World
									<h2>yo</h2>
								</Fragment>
								<input type="text" />
							</Fragment>
						) : (
							<Fragment>
								<Fragment>
									Hello World
									<h2>yo</h2>
								</Fragment>
								foobar
								<input type="text" />
							</Fragment>
						)}
					</div>
				);
			}
		}

		render(<App />, scratch);

		expect(scratch.innerHTML).to.equal('<div><h1>Heading</h1>foobarHello World<h2>yo</h2><input type="text"></div>');

		updateState();

		// See "should preserve state between top level fragment and array"
		// Perhaps rename test to "should reorder **keyed** Fragment children"
		rerender();
		expect(scratch.innerHTML).to.equal('<div><h1>Heading</h1>Hello World<h2>yo</h2>foobar<input type="text"></div>');
	});

	it('should render sibling fragments with multiple children in the correct order', () => {
		render((
			<ol>
				<Fragment>
					<li>0</li>
					<li>1</li>
				</Fragment>
				<Fragment>
					<li>2</li>
					<li>3</li>
				</Fragment>
			</ol>
		), scratch);

		expect(scratch.textContent).to.equal('0123');
	});

	it('should support HOCs that return children', () => {
		const text = 'Don\'t forget to tell these special people in your life just how special they are to you.';

		class BobRossProvider extends Component {
			getChildContext() {
				return { text };
			}

			render(props) {
				return props.children;
			}
		}

		function BobRossConsumer(props, context) {
			return props.children(context.text);
		}

		const Say = props => <div>{props.text}</div>;

		const Speak = () => (
			<Fragment>
				<span>the top</span>
				<BobRossProvider>
					<span>a span</span>
					<BobRossConsumer>
						{ text => [
							<Say text={text} />,
							<Say text={text} />
						] }
					</BobRossConsumer>
					<span>another span</span>
				</BobRossProvider>
				<span>a final span</span>
			</Fragment>
		);

		render(<Speak />, scratch);

		expect(scratch.innerHTML).to.equal([
			span('the top'),
			span('a span'),
			div(text),
			div(text),
			span('another span'),
			span('a final span')
		].join(''));
	});
});
