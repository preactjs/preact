import { createElement as h, render, Component, Fragment } from '../../src/index';
import { setupScratch, teardown, setupRerender } from '../_util/helpers';
import { span, div, ol, li } from '../_util/dom';
import { logCall, clearLog, getLog } from '../_util/logCall';

/** @jsx h */
/* eslint-disable react/jsx-boolean-value */

describe('Fragment', () => {

	let expectDomLog = false;

	/** @type {HTMLDivElement} */
	let scratch;

	/** @type {() => void} */
	let rerender;

	let ops = [];

	function expectDomLogToBe(expectedOperations) {
		if (expectDomLog) {
			expect(getLog()).to.deep.equal(expectedOperations);
		}
	}

	class Stateful extends Component {
		componentDidUpdate() {
			ops.push('Update Stateful');
		}
		render() {
			return <div>Hello</div>;
		}
	}

	before(() => {
		logCall(Element.prototype, 'insertBefore');
		logCall(Element.prototype, 'appendChild');
		logCall(Element.prototype, 'remove');
	});

	beforeEach(() => {
		scratch = setupScratch();
		rerender = setupRerender();
		ops = [];
	});

	afterEach(() => {
		teardown(scratch);
		scratch = null;
	});

	it('should not render empty Fragment', () => {
		render(<Fragment />, scratch);
		expect(scratch.innerHTML).to.equal('');
	});

	it('should render a single child', () => {
		clearLog();
		render((
			<Fragment>
				<span>foo</span>
			</Fragment>
		), scratch);

		// Issue #193: Improve Fragment diff performance
		// TODO: With this test, the Fragment with just one child will invoke
		// node.appendChild on a DOM element that is already appened to the `node`.
		// I think we need the oldParentVNode to get the old first DOM child to
		// effectively diff the children, because the parentVNode (the Fragment)
		// comes from the newTree and so won't ever have ._dom set before diffing
		// children.

		expect(scratch.innerHTML).to.equal('<span>foo</span>');
		expectDomLogToBe([
			'<span>.appendChild(#text)',
			'<div>.appendChild(<span>foo)',
			// See issue #193 - redundant operations (append)
			'<div>foo.appendChild(<span>foo)'
		]);
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

		clearLog();
		render(<Foo condition={false} />, scratch);

		expect(ops).to.deep.equal(['Update Stateful']);
		expect(scratch.innerHTML).to.equal('<div>Hello</div>');
		expectDomLogToBe([]);

		clearLog();
		render(<Foo condition={true} />, scratch);

		expect(ops).to.deep.equal(['Update Stateful', 'Update Stateful']);
		expect(scratch.innerHTML).to.equal('<div>Hello</div>');
		expectDomLogToBe([]);
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

		clearLog();
		render(<Foo condition={false} />, scratch);

		expect(ops).to.deep.equal(['Update Stateful']);
		expect(scratch.innerHTML).to.equal('<div></div><div>Hello</div>');
		expectDomLogToBe([
			'<div>Hello.insertBefore(<div>, <div>Hello)'
		]);

		clearLog();
		render(<Foo condition={true} />, scratch);

		expect(ops).to.deep.equal(['Update Stateful', 'Update Stateful']);
		expect(scratch.innerHTML).to.equal('<div>Hello</div>');
		expectDomLogToBe([
			'<div>.remove()',
			// See issue #193 - redundant operations (multiple Fragments)
			'<div>Hello.appendChild(<div>Hello)',
			'<div>Hello.appendChild(<div>Hello)'
		]);
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

		clearLog();
		render(<Foo condition={false} />, scratch);

		expect(ops).to.deep.equal([]);
		expect(scratch.innerHTML).to.equal('<div>Hello</div>');
		expectDomLogToBe([
			'<div>.appendChild(#text)',
			'<div>Hello.insertBefore(<div>Hello, <div>Hello)',
			// See issue #193 - redundant operations (remove)
			'<div>Hello.remove()',
			'<div>Hello.remove()',
			'<div>Hello.remove()'
		]);

		clearLog();
		render(<Foo condition={true} />, scratch);

		expect(ops).to.deep.equal([]);
		expect(scratch.innerHTML).to.equal('<div>Hello</div>');
		expectDomLogToBe([
			'<div>.appendChild(#text)',
			'<div>Hello.appendChild(<div>Hello)',
			// See issue #193 - redudant operations (remove)
			'<div>Hello.remove()',
			'<div>Hello.remove()'
		]);
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

		clearLog();
		render(<Foo condition={false} />, scratch);

		expect(ops).to.deep.equal([]);
		expect(scratch.innerHTML).to.equal('<div>Hello</div>');
		expectDomLogToBe([
			// See issue #193 - redundant operations (remove)
			'<div>Hello.remove()',
			'<div>Hello.remove()',
			'<div>.appendChild(#text)',
			'<div>.appendChild(<div>Hello)',
			'<div>Hello.appendChild(<div>Hello)'
		]);

		clearLog();
		render(<Foo condition={true} />, scratch);

		expect(ops).to.deep.equal([]);
		expect(scratch.innerHTML).to.equal('<div>Hello</div>');
		expectDomLogToBe([
			// See issue #193 - redudant operations (remove)
			'<div>Hello.remove()',
			'<div>Hello.remove()',
			'<div>Hello.remove()',
			'<div>Hello.remove()',
			'<div>.appendChild(#text)',
			'<div>.appendChild(<div>Hello)'
		]);
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
						<div>foo</div>
						<div key="b">
							<Stateful key="a" />
						</div>
					</Fragment>
					<div>boop</div>
				</div>
			) : (
				<div>
					<div>beep</div>
					<Fragment key="c">
						<div key="b">
							<Stateful key="a" />
						</div>
						<div>bar</div>
					</Fragment>
				</div>
			);
		}

		const htmlForTrue = div([
			div('foo'),
			div(div('Hello')),
			div('boop')
		].join(''));

		const htmlForFalse = div([
			div('beep'),
			div(div('Hello')),
			div('bar')
		].join(''));

		clearLog();
		render(<Foo condition={true} />, scratch);

		expect(scratch.innerHTML).to.equal(htmlForTrue);

		clearLog();
		render(<Foo condition={false} />, scratch);

		expect(ops).to.deep.equal(['Update Stateful']);
		expect(scratch.innerHTML).to.equal(htmlForFalse);
		expectDomLogToBe([
			'<div>fooHellobeep.insertBefore(<div>beep, <div>foo)',
			'<div>beepbarHello.appendChild(<div>bar)'
		]);

		clearLog();
		render(<Foo condition={true} />, scratch);

		expect(ops).to.deep.equal(['Update Stateful', 'Update Stateful']);
		expect(scratch.innerHTML).to.equal(htmlForTrue);
		expectDomLogToBe([
			'<div>beepHellofoo.appendChild(<div>Hello)',
			'<div>boopfooHello.appendChild(<div>boop)'
		]);
	});

	it('should not preserve state when switching to a keyed fragment to an array', () => {
		function Foo({ condition }) {
			return condition ? (
				<div>
					{
						<Fragment key="foo">
							<span>1</span>
							<Stateful />
						</Fragment>
					}
					<span>2</span>
				</div>
			) : (
				<div>
					{[
						<span>1</span>,
						<Stateful />
					]}
					<span>2</span>
				</div>
			);
		}

		const html = div([
			span('1'),
			div('Hello'),
			span('2')
		].join(''));

		clearLog();
		render(<Foo condition={true} />, scratch);

		clearLog();
		render(<Foo condition={false} />,  scratch);

		expect(ops).to.deep.equal([]);
		expect(scratch.innerHTML).to.equal(html);
		expectDomLogToBe([
			'<div>1Hello1.insertBefore(<span>1, <span>1)',
			'<div>.appendChild(#text)',
			'<div>11Hello.insertBefore(<div>Hello, <span>1)',
			'<span>.appendChild(#text)',
			'<div>1Hello1Hello.insertBefore(<span>2, <span>1)',
			// See issue #193 - redundant operations (remove)
			'<span>1.remove()',
			'<span>1.remove()',
			'<div>Hello.remove()',
			'<div>Hello.remove()'
		]);

		clearLog();
		render(<Foo condition={true} />, scratch);

		expect(ops).to.deep.equal([]);
		expect(scratch.innerHTML).to.equal(html);
		expectDomLogToBe([
			'<span>.appendChild(#text)',
			'<div>1Hello2.appendChild(<span>1)',
			'<div>.appendChild(#text)',
			'<div>1Hello21.appendChild(<div>Hello)',
			'<div>2Hello21Hello.appendChild(<span>2)',
			'<span>2.remove()',
			// See issue #193 - redundant operations (remove)
			'<div>Hello.remove()',
			'<div>Hello.remove()'
		]);
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
		clearLog();
		render((
			<Fragment>
				spam
				<Fragment>foo</Fragment>
				<Fragment />
				bar
			</Fragment>
		), scratch);

		expect(scratch.innerHTML).to.equal('spamfoobar');
		expectDomLogToBe([
			'<div>.appendChild(#text)',
			'<div>spam.appendChild(#text)',
			'<div>spamfoo.appendChild(#text)',
			'<div>spamfoo.appendChild(#text)'
		]);

		clearLog();
		render((
			<Fragment>
				<Fragment>foo</Fragment>
				<Fragment>bar</Fragment>
			</Fragment>
		), scratch);

		expect(scratch.innerHTML).to.equal('foobar');
		expectDomLogToBe([
			'<div>spamfoobar.appendChild(#text)'
		]);
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
						<span>0</span>
						{this.state.value && 'foo'}
						<span>1</span>
					</Fragment>
				);
			}
		}

		const html = contents => span('0') + contents + span('1');

		render(<Comp />, scratch);
		expect(scratch.innerHTML).to.equal(html('foo'));

		update();
		rerender();

		expect(scratch.innerHTML).to.equal(html(''));

		update();
		rerender();
		expect(scratch.innerHTML).to.equal(html('foo'));
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
				<li>0</li>
				<Fragment>
					<li>1</li>
					<li>2</li>
				</Fragment>
				<li>3</li>
				<li>4</li>
				<Fragment>
					<li>5</li>
					<li>6</li>
				</Fragment>
				<li>7</li>
			</ol>
		), scratch);

		expect(scratch.textContent).to.equal('01234567');
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

	it('should support conditionally rendered Fragment', () => {
		const Foo = ({ condition }) => (
			<ol>
				<li>0</li>
				{condition ? (
					<Fragment>
						<li>1</li>
						<li>2</li>
					</Fragment>
				) : ([
					<li>1</li>,
					<li>2</li>
				])}
				<li>3</li>
			</ol>
		);

		const html = ol([
			li('0'),
			li('1'),
			li('2'),
			li('3')
		].join(''));

		clearLog();
		render(<Foo condition={true} />, scratch);
		expect(scratch.innerHTML).to.equal(html);
		expectDomLogToBe([
			'<li>.appendChild(#text)',
			'<ol>.appendChild(<li>0)',
			'<li>.appendChild(#text)',
			'<ol>0.appendChild(<li>1)',
			'<li>.appendChild(#text)',
			'<ol>01.appendChild(<li>2)',
			'<li>.appendChild(#text)',
			'<ol>012.appendChild(<li>3)',
			'<div>.appendChild(<ol>0123)'
		]);

		clearLog();
		render(<Foo condition={false} />,  scratch);
		expect(scratch.innerHTML).to.equal(html);
		expectDomLogToBe([
			// see issue #193 - redundant ops (remove) and move non-optimal moves?
			'<li>.appendChild(#text)',
			'<ol>0121.appendChild(<li>2)',
			'<li>.appendChild(#text)',
			'<ol>01212.appendChild(<li>3)',
			'<li>1.remove()',
			'<li>1.remove()',
			'<li>2.remove()'
		]);

		clearLog();
		render(<Foo condition={true} />, scratch);
		expect(scratch.innerHTML).to.equal(html);
		expectDomLogToBe([
			'<li>.appendChild(#text)',
			'<ol>0123.appendChild(<li>1)',
			'<li>.appendChild(#text)',
			'<ol>01231.appendChild(<li>2)',
			'<ol>013312.appendChild(<li>3)',
			'<li>3.remove()',
			'<li>1.remove()'
		]);
	});

	it('should support conditionally rendered Fragment or null', () => {
		const Foo = ({ condition }) => (
			<ol>
				<li>0</li>
				{condition ? (
					<Fragment>
						<li>1</li>
						<li>2</li>
					</Fragment>
				) : null }
				<li>3</li>
				<li>4</li>
			</ol>
		);

		const htmlForTrue = ol([
			li('0'),
			li('1'),
			li('2'),
			li('3'),
			li('4')
		].join(''));

		const htmlForFalse = ol([
			li('0'),
			li('3'),
			li('4')
		].join(''));

		clearLog();
		render(<Foo condition={true} />, scratch);
		expect(scratch.innerHTML).to.equal(htmlForTrue);
		expectDomLogToBe([
			'<li>.appendChild(#text)',
			'<ol>.appendChild(<li>0)',
			'<li>.appendChild(#text)',
			'<ol>0.appendChild(<li>1)',
			'<li>.appendChild(#text)',
			'<ol>01.appendChild(<li>2)',
			'<li>.appendChild(#text)',
			'<ol>012.appendChild(<li>3)',
			'<li>.appendChild(#text)',
			'<ol>0123.appendChild(<li>4)',
			'<div>.appendChild(<ol>01234)'
		]);

		clearLog();
		render(<Foo condition={false} />,  scratch);
		expect(scratch.innerHTML).to.equal(htmlForFalse);
		expectDomLogToBe([
			// see issue #193 - redundant operations (remove)
			'<li>1.remove()',
			'<li>1.remove()',
			'<li>2.remove()'
		]);

		clearLog();
		render(<Foo condition={true} />, scratch);
		expect(scratch.innerHTML).to.equal(htmlForTrue);
		expectDomLogToBe([
			'<li>.appendChild(#text)',
			'<ol>034.appendChild(<li>1)',
			'<li>.appendChild(#text)',
			'<ol>0341.appendChild(<li>2)',
			// see issue #193 - re-appends Fragment siblings
			'<ol>03312.appendChild(<li>3)',
			'<ol>04123.appendChild(<li>4)'
		]);
	});

	it.skip('should support moving Fragments between beginning and end', () => {
		const Foo = ({ condition }) => (
			<ol>
				{condition ? [
					<li>0</li>,
					<li>1</li>,
					<li>2</li>,
					<li>3</li>,
					<Fragment>
						<li>4</li>
						<li>5</li>
					</Fragment>
				 ] : [
					<Fragment>
						<li>4</li>
						<li>5</li>
					</Fragment>,
					<li>0</li>,
					<li>1</li>,
					<li>2</li>,
					<li>3</li>
				 ]}
			</ol>
		);

		const htmlForTrue = ol([
			li('0'),
			li('1'),
			li('2'),
			li('3'),
			li('4'),
			li('5')
		].join(''));

		const htmlForFalse = ol([
			li('4'),
			li('5'),
			li('0'),
			li('1'),
			li('2'),
			li('3')
		].join(''));

		clearLog();
		render(<Foo condition={true} />, scratch);
		expect(scratch.innerHTML).to.equal(htmlForTrue, 'initial render of true');

		clearLog();
		render(<Foo condition={false} />,  scratch);
		expect(scratch.innerHTML).to.equal(htmlForFalse, 'rendering from true to false');
		expectDomLogToBe([
			// see issue #193 - re-appends all children after Fragment
			'<ol>002345.appendChild(<li>0)',
			'<ol>013450.appendChild(<li>1)',
			'<ol>024501.appendChild(<li>2)',
			'<ol>345012.appendChild(<li>3)'
		]);

		clearLog();
		render(<Foo condition={true} />, scratch);
		// TODO: Fails here...
		expect(scratch.innerHTML).to.equal(htmlForTrue, 'rendering from false to true');
		expectDomLogToBe([
			'<li>.appendChild(#text)',
			'<ol>034.appendChild(<li>1)',
			'<li>.appendChild(#text)',
			'<ol>0341.appendChild(<li>2)',
			// see issue #193 - re-appends Fragment siblings
			'<ol>03312.appendChild(<li>3)',
			'<ol>04123.appendChild(<li>4)'
		]);
	});

	it.skip('should support conditional beginning and end Fragments', () => {
		const Foo = ({ condition }) => (
			<ol>
				{condition ?
					<Fragment>
						<li>0</li>
						<li>1</li>
					</Fragment>
					: null
				}
				<li>2</li>
				<li>2</li>
				{condition ?
					null :
					<Fragment>
						<li>3</li>
						<li>4</li>
					</Fragment>
				}
			</ol>
		);

		const htmlForTrue = ol([
			li(0),
			li(1),
			li(2),
			li(2)
		].join(''));

		const htmlForFalse = ol([
			li(2),
			li(2),
			li(3),
			li(4)
		].join(''));

		clearLog();
		render(<Foo condition={true} />, scratch);
		expect(scratch.innerHTML).to.equal(htmlForTrue, 'initial render of true');

		clearLog();
		render(<Foo condition={false} />, scratch);
		// TODO: Fails here...
		expect(scratch.innerHTML).to.equal(htmlForFalse, 'rendering from true to false');
		expectDomLogToBe([
			'<ol>3422.appendChild(<li>3)',
			'<ol>4223.appendChild(<li>4)'
		]);

		clearLog();
		render(<Foo condition={true} />, scratch);
		expect(scratch.innerHTML).to.equal(htmlForTrue, 'rendering from false to true');
		expectDomLogToBe([
			'<ol>2201.appendChild(<li>2)',
			'<ol>2012.appendChild(<li>2)'
		]);
	});

	it.skip('should preserve state with reordering in multiple levels with mixed # of Fragment siblings', () => {
		// Also fails if the # of divs outside the Fragment equals or exceeds
		// the # inside the Fragment for both conditions
		function Foo({ condition }) {
			return condition ? (
				<div>
					<Fragment key="c">
						<div>foo</div>
						<div key="b">
							<Stateful key="a" />
						</div>
					</Fragment>
					<div>boop</div>
					<div>boop</div>
				</div>
			) : (
				<div>
					<div>beep</div>
					<Fragment key="c">
						<div key="b">
							<Stateful key="a" />
						</div>
						<div>bar</div>
					</Fragment>
				</div>
			);
		}

		const htmlForTrue = div([
			div('foo'),
			div(div('Hello')),
			div('boop'),
			div('boop')
		].join(''));

		const htmlForFalse = div([
			div('beep'),
			div(div('Hello')),
			div('bar')
		].join(''));

		render(<Foo condition={true} />, scratch);
		render(<Foo condition={false} />, scratch);

		expect(ops).to.deep.equal(['Update Stateful']);
		expect(scratch.innerHTML).to.equal(htmlForFalse, 'rendering from true to false');
		expectDomLogToBe([]); // TODO: Fill in when this test passes

		render(<Foo condition={true} />, scratch);

		expect(ops).to.deep.equal(['Update Stateful', 'Update Stateful']);
		expect(scratch.innerHTML).to.equal(htmlForTrue, 'rendering from false to true');
		expectDomLogToBe([]); // TODO: Fill in when this test passes
	});

	it.skip('should preserve state with reordering in multiple levels with lots of Fragment siblings', () => {
		// Also fails if the # of divs outside the Fragment equals or exceeds
		// the # inside the Fragment for both conditions
		function Foo({ condition }) {
			return condition ? (
				<div>
					<Fragment key="c">
						<div>foo</div>
						<div key="b">
							<Stateful key="a" />
						</div>
					</Fragment>
					<div>boop</div>
					<div>boop</div>
					<div>boop</div>
				</div>
			) : (
				<div>
					<div>beep</div>
					<div>beep</div>
					<div>beep</div>
					<Fragment key="c">
						<div key="b">
							<Stateful key="a" />
						</div>
						<div>bar</div>
					</Fragment>
				</div>
			);
		}

		const htmlForTrue = div([
			div('foo'),
			div(div('Hello')),
			div('boop'),
			div('boop'),
			div('boop')
		].join(''));

		const htmlForFalse = div([
			div('beep'),
			div('beep'),
			div('beep'),
			div(div('Hello')),
			div('bar')
		].join(''));

		render(<Foo condition={true} />, scratch);
		render(<Foo condition={false} />, scratch);

		expect(ops).to.deep.equal(['Update Stateful']);
		expect(scratch.innerHTML).to.equal(htmlForFalse, 'rendering from true to false');
		expectDomLogToBe([]); // TODO: Fill in when this test passes

		render(<Foo condition={true} />, scratch);

		expect(ops).to.deep.equal(['Update Stateful', 'Update Stateful']);
		expect(scratch.innerHTML).to.equal(htmlForTrue, 'rendering from false to true');
		expectDomLogToBe([]); // TODO: Fill in when this test passes
	});

	it('should correctly append children with siblings', () => {

		/**
		 * @type {(props: { values: Array<string | number>}) => JSX.Element}
		 */
		const Foo = ({ values }) => (
			<ol>
				<li>a</li>
				<Fragment>
					{values.map(value => <li>{value}</li>)}
				</Fragment>
				<li>b</li>
			</ol>
		);

		const getHtml = values => ol([
			li('a'),
			...values.map(value => li(value)),
			li('b')
		].join(''));

		let values = [0,1,2];
		clearLog();
		render(<Foo values={values} />, scratch);
		expect(scratch.innerHTML).to.equal(getHtml(values), `original list: [${values.join(',')}]`);

		values.push(3);

		clearLog();
		render(<Foo values={values} />, scratch);
		expect(scratch.innerHTML).to.equal(getHtml(values), `push 3: [${values.join(',')}]`);
		expectDomLogToBe([
			'<li>.appendChild(#text)',
			'<ol>a012b.insertBefore(<li>3, <li>b)'
		]);

		values.push(4);

		clearLog();
		render(<Foo values={values} />, scratch);
		expect(scratch.innerHTML).to.equal(getHtml(values), `push 4: [${values.join(',')}]`);
		expectDomLogToBe([
			'<li>.appendChild(#text)',
			'<ol>a0123b.insertBefore(<li>4, <li>b)'
		]);
	});
});
