import { createElement, Component, render, createRef } from 'preact';
import { setupRerender } from 'preact/test-utils';
import { setupScratch, teardown } from '../_util/helpers';
import { logCall, clearLog, getLog } from '../_util/logCall';
import { div } from '../_util/dom';

/** @jsx createElement */

describe('keys', () => {
	/** @type {HTMLDivElement} */
	let scratch;

	let rerender;

	/** @type {string[]} */
	let ops;

	function createStateful(name) {
		return class Stateful extends Component {
			componentDidUpdate() {
				ops.push(`Update ${name}`);
			}
			componentDidMount() {
				ops.push(`Mount ${name}`);
			}
			componentWillUnmount() {
				ops.push(`Unmount ${name}`);
			}
			render() {
				return <div>{name}</div>;
			}
		};
	}

	/** @type {(props: {values: any[]}) => any} */
	const List = props => (
		<ol>
			{props.values.map(value => (
				<li key={value}>{value}</li>
			))}
		</ol>
	);

	/**
	 * Move an element in an array from one index to another
	 * @param {any[]} values The array of values
	 * @param {number} from The index to move from
	 * @param {number} to The index to move to
	 */
	function move(values, from, to) {
		const value = values[from];
		values.splice(from, 1);
		values.splice(to, 0, value);
	}

	let resetAppendChild;
	let resetInsertBefore;
	let resetRemoveChild;
	let resetRemove;
	let resetRemoveText;

	before(() => {
		resetAppendChild = logCall(Element.prototype, 'appendChild');
		resetInsertBefore = logCall(Element.prototype, 'insertBefore');
		resetRemoveChild = logCall(Element.prototype, 'removeChild');
		resetRemove = logCall(Element.prototype, 'remove');
		resetRemoveText = logCall(Text.prototype, 'remove');
	});

	after(() => {
		resetAppendChild();
		resetInsertBefore();
		resetRemoveChild();
		resetRemove();
		resetRemoveText();
	});

	beforeEach(() => {
		scratch = setupScratch();
		rerender = setupRerender();
		ops = [];
	});

	afterEach(() => {
		teardown(scratch);
		clearLog();
	});

	// https://fb.me/react-special-props
	it('should not pass key in props', () => {
		const Foo = sinon.spy(function Foo() {
			return null;
		});
		render(<Foo key="foo" />, scratch);
		expect(Foo.args[0][0]).to.deep.equal({});
	});

	it('should update in-place keyed DOM nodes', () => {
		render(
			<ul>
				<li key="0">a</li>
				<li key="1">b</li>
				<li key="2">c</li>
			</ul>,
			scratch
		);
		expect(scratch.innerHTML).to.equal(
			'<ul><li>a</li><li>b</li><li>c</li></ul>'
		);

		render(
			<ul>
				<li key="0">x</li>
				<li key="1">y</li>
				<li key="2">z</li>
			</ul>,
			scratch
		);
		expect(scratch.innerHTML).to.equal(
			'<ul><li>x</li><li>y</li><li>z</li></ul>'
		);
	});

	// See preactjs/preact-compat#21
	it('should remove orphaned keyed nodes', () => {
		render(
			<div>
				<div>1</div>
				<li key="a">a</li>
				<li key="b">b</li>
			</div>,
			scratch
		);

		render(
			<div>
				<div>2</div>
				<li key="b">b</li>
				<li key="c">c</li>
			</div>,
			scratch
		);

		expect(scratch.innerHTML).to.equal(
			'<div><div>2</div><li>b</li><li>c</li></div>'
		);
	});

	it('should remove keyed nodes (#232)', () => {
		class App extends Component {
			componentDidMount() {
				setTimeout(() => this.setState({ opened: true, loading: true }), 10);
				setTimeout(() => this.setState({ opened: true, loading: false }), 20);
			}

			render({ opened, loading }) {
				return (
					<BusyIndicator id="app" busy={loading}>
						<div>This div needs to be here for this to break</div>
						{opened && !loading && <div>{[]}</div>}
					</BusyIndicator>
				);
			}
		}

		class BusyIndicator extends Component {
			render({ children, busy }) {
				return (
					<div class={busy ? 'busy' : ''}>
						{children && children.length ? (
							children
						) : (
							<div class="busy-placeholder" />
						)}
						<div class="indicator">
							<div>indicator</div>
							<div>indicator</div>
							<div>indicator</div>
						</div>
					</div>
				);
			}
		}

		render(<App />, scratch);
		render(<App opened loading />, scratch);
		render(<App opened />, scratch);

		const html = String(scratch.firstChild.innerHTML).replace(/ class=""/g, '');
		expect(html).to.equal(
			'<div>This div needs to be here for this to break</div><div></div><div class="indicator"><div>indicator</div><div>indicator</div><div>indicator</div></div>'
		);
	});

	it('should append new keyed elements', () => {
		const values = ['a', 'b'];

		render(<List values={values} />, scratch);
		expect(scratch.textContent).to.equal('ab');

		values.push('c');
		clearLog();

		render(<List values={values} />, scratch);
		expect(scratch.textContent).to.equal('abc');
		expect(getLog()).to.deep.equal([
			'<li>.appendChild(#text)',
			'<ol>ab.appendChild(<li>c)'
		]);
	});

	it('should remove keyed elements from the end', () => {
		const values = ['a', 'b', 'c', 'd'];

		render(<List values={values} />, scratch);
		expect(scratch.textContent).to.equal('abcd');

		values.pop();
		clearLog();

		render(<List values={values} />, scratch);
		expect(scratch.textContent).to.equal('abc');
		expect(getLog()).to.deep.equal(['<li>d.remove()']);
	});

	it('should prepend keyed elements to the beginning', () => {
		const values = ['b', 'c'];

		render(<List values={values} />, scratch);
		expect(scratch.textContent).to.equal('bc');

		values.unshift('a');
		clearLog();

		render(<List values={values} />, scratch);
		expect(scratch.textContent).to.equal('abc');
		expect(getLog()).to.deep.equal([
			'<li>.appendChild(#text)',
			'<ol>bc.insertBefore(<li>a, <li>b)'
		]);
	});

	it('should remove keyed elements from the beginning', () => {
		const values = ['z', 'a', 'b', 'c'];

		render(<List values={values} />, scratch);
		expect(scratch.textContent).to.equal('zabc');

		values.shift();
		clearLog();

		render(<List values={values} />, scratch);
		expect(scratch.textContent).to.equal('abc');
		expect(getLog()).to.deep.equal(['<li>z.remove()']);
	});

	it('should insert new keyed children in the middle', () => {
		const values = ['a', 'c'];

		render(<List values={values} />, scratch);
		expect(scratch.textContent).to.equal('ac');

		values.splice(1, 0, 'b');
		clearLog();

		render(<List values={values} />, scratch);
		expect(scratch.textContent).to.equal('abc');
		expect(getLog()).to.deep.equal([
			'<li>.appendChild(#text)',
			'<ol>ac.insertBefore(<li>b, <li>c)'
		]);
	});

	it('should remove keyed children from the middle', () => {
		const values = ['a', 'b', 'x', 'y', 'z', 'c', 'd'];

		render(<List values={values} />, scratch);
		expect(scratch.textContent).to.equal('abxyzcd');

		values.splice(2, 3);
		clearLog();

		render(<List values={values} />, scratch);
		expect(scratch.textContent).to.equal('abcd');
		expect(getLog()).to.deep.equal([
			'<li>x.remove()',
			'<li>y.remove()',
			'<li>z.remove()'
		]);
	});

	it('should move keyed children to the beginning', () => {
		const values = ['b', 'c', 'd', 'a'];

		render(<List values={values} />, scratch);
		expect(scratch.textContent).to.equal('bcda');

		move(values, values.length - 1, 0);
		clearLog();

		render(<List values={values} />, scratch);
		expect(scratch.textContent).to.equal('abcd');
		expect(getLog()).to.deep.equal(['<ol>bcda.insertBefore(<li>a, <li>b)']);
	});

	it('should move multiple keyed children to the beginning', () => {
		const values = ['c', 'd', 'e', 'a', 'b'];

		render(<List values={values} />, scratch);
		expect(scratch.textContent).to.equal('cdeab');

		move(values, values.length - 1, 0);
		move(values, values.length - 1, 0);
		clearLog();

		render(<List values={values} />, scratch);
		expect(scratch.textContent).to.equal('abcde');
		expect(getLog()).to.deep.equal([
			'<ol>cdeab.insertBefore(<li>a, <li>c)',
			'<ol>acdeb.insertBefore(<li>b, <li>c)'
		]);
	});

	it('should swap keyed children efficiently', () => {
		render(<List values={['a', 'b']} />, scratch);
		expect(scratch.textContent).to.equal('ab');

		clearLog();

		render(<List values={['b', 'a']} />, scratch);
		expect(scratch.textContent).to.equal('ba');

		expect(getLog()).to.deep.equal(['<ol>ab.appendChild(<li>a)']);
	});

	it('should swap existing keyed children in the middle of a list efficiently', () => {
		const values = ['a', 'b', 'c', 'd'];

		render(<List values={values} />, scratch);
		expect(scratch.textContent).to.equal('abcd');

		// swap
		move(values, 1, 2);
		clearLog();

		render(<List values={values} />, scratch);
		expect(scratch.textContent).to.equal('acbd', 'initial swap');
		expect(getLog()).to.deep.equal(
			['<ol>abcd.insertBefore(<li>b, <li>d)'],
			'initial swap'
		);

		// swap back
		move(values, 2, 1);
		clearLog();

		render(<List values={values} />, scratch);
		expect(scratch.textContent).to.equal('abcd', 'swap back');
		expect(getLog()).to.deep.equal(
			['<ol>acbd.insertBefore(<li>c, <li>d)'],
			'swap back'
		);
	});

	it('should move keyed children to the end of the list', () => {
		const values = ['a', 'b', 'c', 'd'];

		render(<List values={values} />, scratch);
		expect(scratch.textContent).to.equal('abcd');

		// move to end
		move(values, 0, values.length - 1);
		clearLog();

		render(<List values={values} />, scratch);
		expect(scratch.textContent).to.equal('bcda', 'move to end');
		expect(getLog()).to.deep.equal(
			['<ol>abcd.appendChild(<li>a)'],
			'move to end'
		);

		// move to beginning
		move(values, values.length - 1, 0);
		clearLog();

		render(<List values={values} />, scratch);
		expect(scratch.textContent).to.equal('abcd', 'move to beginning');
		expect(getLog()).to.deep.equal(
			['<ol>bcda.insertBefore(<li>a, <li>b)'],
			'move to beginning'
		);
	});

	it('should move keyed children to the beginning on longer list', () => {
		// Preact v10 worst case
		const values = ['a', 'b', 'c', 'd', 'e', 'f'];

		render(<List values={values} />, scratch);
		expect(scratch.textContent).to.equal('abcdef');

		move(values, 4, 1);
		clearLog();

		render(<List values={values} />, scratch);
		expect(scratch.textContent).to.equal('aebcdf');
		expect(getLog()).to.deep.equal(['<ol>abcdef.insertBefore(<li>e, <li>b)']);
	});

	it('should move keyed children to the end on longer list', () => {
		const values = ['a', 'b', 'c', 'd', 'e', 'f'];

		render(<List values={values} />, scratch);
		expect(scratch.textContent).to.equal('abcdef');

		move(values, 1, values.length - 2);
		clearLog();

		render(<List values={values} />, scratch);
		expect(scratch.textContent).to.equal('acdebf');
		expect(getLog()).to.deep.equal(['<ol>abcdef.insertBefore(<li>b, <li>f)']);
	});

	it('should reverse keyed children effectively', () => {
		const values = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'];

		render(<List values={values} />, scratch);
		expect(scratch.textContent).to.equal(values.join(''));

		// reverse list
		values.reverse();
		clearLog();

		render(<List values={values} />, scratch);
		expect(scratch.textContent).to.equal(values.join(''));
		// expect(getLog()).to.have.lengthOf(9);
		expect(getLog()).to.deep.equal([
			'<ol>abcdefghij.insertBefore(<li>j, <li>a)',
			'<ol>jabcdefghi.insertBefore(<li>i, <li>a)',
			'<ol>jiabcdefgh.insertBefore(<li>h, <li>a)',
			'<ol>jihabcdefg.insertBefore(<li>g, <li>a)',
			'<ol>jihgabcdef.insertBefore(<li>f, <li>a)',
			'<ol>jihgfabcde.insertBefore(<li>e, <li>a)',
			'<ol>jihgfeabcd.insertBefore(<li>d, <li>a)',
			'<ol>jihgfedabc.insertBefore(<li>c, <li>a)',
			'<ol>jihgfedcab.appendChild(<li>a)'
		]);
	});

	it('should properly remove children of memoed components', () => {
		const values = [1, 2, 3, 4, 5, 6, 7, 8, 9];

		class Item extends Component {
			shouldComponentUpdate(props) {
				return props.value !== this.props.value;
			}

			render() {
				return <li>{this.props.value}</li>;
			}
		}

		function App({ values }) {
			return (
				<ul>
					{values.map(value => (
						<Item key={value} value={value} />
					))}
				</ul>
			);
		}

		render(<App values={values} />, scratch);
		expect(scratch.textContent).to.equal(values.join(''));

		clearLog();
		values.splice(3, 3);

		render(<App values={values} />, scratch);
		expect(scratch.textContent).to.equal(values.join(''));
		expect(getLog()).to.deep.equal([
			'<li>4.remove()',
			'<li>5.remove()',
			'<li>6.remove()'
		]);
	});

	it("should not preserve state when a component's keys are different", () => {
		const Stateful = createStateful('Stateful');

		function Foo({ condition }) {
			return condition ? <Stateful key="a" /> : <Stateful key="b" />;
		}

		ops = [];
		render(<Foo condition />, scratch);
		expect(scratch.innerHTML).to.equal('<div>Stateful</div>');
		expect(ops).to.deep.equal(['Mount Stateful'], 'initial mount');

		ops = [];
		render(<Foo condition={false} />, scratch);
		expect(scratch.innerHTML).to.equal('<div>Stateful</div>');
		expect(ops).to.deep.equal(
			['Unmount Stateful', 'Mount Stateful'],
			'switching keys 1'
		);

		ops = [];
		render(<Foo condition />, scratch);
		expect(scratch.innerHTML).to.equal('<div>Stateful</div>');
		expect(ops).to.deep.equal(
			['Unmount Stateful', 'Mount Stateful'],
			'switching keys 2'
		);
	});

	it('should not preserve state between an unkeyed and keyed component', () => {
		// React and Preact v8 behavior: https://codesandbox.io/s/57prmy5mx

		const Stateful = createStateful('Stateful');

		function Foo({ keyed }) {
			return keyed ? <Stateful key="a" /> : <Stateful />;
		}

		ops = [];
		render(<Foo keyed />, scratch);
		expect(scratch.innerHTML).to.equal('<div>Stateful</div>');
		expect(ops).to.deep.equal(['Mount Stateful'], 'initial mount with key');

		ops = [];
		render(<Foo keyed={false} />, scratch);
		expect(scratch.innerHTML).to.equal('<div>Stateful</div>');
		expect(ops).to.deep.equal(
			['Unmount Stateful', 'Mount Stateful'],
			'switching from keyed to unkeyed'
		);

		ops = [];
		render(<Foo keyed />, scratch);
		expect(scratch.innerHTML).to.equal('<div>Stateful</div>');
		expect(ops).to.deep.equal(
			['Unmount Stateful', 'Mount Stateful'],
			'switching from unkeyed to keyed'
		);
	});

	it('should not preserve state when keys change with multiple children', () => {
		// React & Preact v8 behavior: https://codesandbox.io/s/8l3p6lz9kj

		const Stateful1 = createStateful('Stateful1');
		const Stateful2 = createStateful('Stateful2');

		let Stateful1Ref;
		let Stateful2Ref;
		let Stateful1MovedRef;
		let Stateful2MovedRef;

		function Foo({ moved }) {
			return moved ? (
				<div>
					<div>1</div>
					<Stateful1 key="c" ref={c => (Stateful1MovedRef = c)} />
					<div>2</div>
					<Stateful2 key="d" ref={c => (Stateful2MovedRef = c)} />
				</div>
			) : (
				<div>
					<div>1</div>
					<Stateful1 key="a" ref={c => (Stateful1Ref = c)} />
					<div>2</div>
					<Stateful2 key="b" ref={c => (Stateful2Ref = c)} />
				</div>
			);
		}

		const expectedHtml = div([
			div(1),
			div('Stateful1'),
			div(2),
			div('Stateful2')
		]);

		ops = [];
		render(<Foo moved={false} />, scratch);

		expect(scratch.innerHTML).to.equal(expectedHtml);
		expect(ops).to.deep.equal(['Mount Stateful1', 'Mount Stateful2']);
		expect(Stateful1Ref).to.exist;
		expect(Stateful2Ref).to.exist;

		ops = [];
		render(<Foo moved />, scratch);

		expect(scratch.innerHTML).to.equal(expectedHtml);
		expect(ops).to.deep.equal([
			'Unmount Stateful1',
			'Unmount Stateful2',
			'Mount Stateful1',
			'Mount Stateful2'
		]);
		expect(Stateful1MovedRef).to.not.equal(Stateful1Ref);
		expect(Stateful2MovedRef).to.not.equal(Stateful2Ref);

		ops = [];
		render(<Foo moved={false} />, scratch);

		expect(scratch.innerHTML).to.equal(expectedHtml);
		expect(ops).to.deep.equal([
			'Unmount Stateful1',
			'Unmount Stateful2',
			'Mount Stateful1',
			'Mount Stateful2'
		]);
		expect(Stateful1Ref).to.not.equal(Stateful1MovedRef);
		expect(Stateful2Ref).to.not.equal(Stateful2MovedRef);
	});

	it('should preserve state when moving keyed children components', () => {
		// React & Preact v8 behavior: https://codesandbox.io/s/8l3p6lz9kj

		const Stateful1 = createStateful('Stateful1');
		const Stateful2 = createStateful('Stateful2');

		let Stateful1Ref;
		let Stateful2Ref;
		let Stateful1MovedRef;
		let Stateful2MovedRef;

		function Foo({ moved }) {
			return moved ? (
				<div>
					<div>1</div>
					<Stateful2
						key="b"
						ref={c => (c ? (Stateful2MovedRef = c) : undefined)}
					/>
					<div>2</div>
					<Stateful1
						key="a"
						ref={c => (c ? (Stateful1MovedRef = c) : undefined)}
					/>
				</div>
			) : (
				<div>
					<div>1</div>
					<Stateful1 key="a" ref={c => (c ? (Stateful1Ref = c) : undefined)} />
					<div>2</div>
					<Stateful2 key="b" ref={c => (c ? (Stateful2Ref = c) : undefined)} />
				</div>
			);
		}

		const htmlForFalse = div([
			div(1),
			div('Stateful1'),
			div(2),
			div('Stateful2')
		]);

		const htmlForTrue = div([
			div(1),
			div('Stateful2'),
			div(2),
			div('Stateful1')
		]);

		ops = [];
		render(<Foo moved={false} />, scratch);

		expect(scratch.innerHTML).to.equal(htmlForFalse);
		expect(ops).to.deep.equal(['Mount Stateful1', 'Mount Stateful2']);
		expect(Stateful1Ref).to.exist;
		expect(Stateful2Ref).to.exist;

		ops = [];
		render(<Foo moved />, scratch);

		expect(scratch.innerHTML).to.equal(htmlForTrue);
		expect(ops).to.deep.equal(['Update Stateful2', 'Update Stateful1']);
		expect(Stateful1MovedRef).to.equal(Stateful1Ref);
		expect(Stateful2MovedRef).to.equal(Stateful2Ref);

		ops = [];
		render(<Foo moved={false} />, scratch);

		expect(scratch.innerHTML).to.equal(htmlForFalse);
		expect(ops).to.deep.equal(['Update Stateful1', 'Update Stateful2']);
		expect(Stateful1Ref).to.equal(Stateful1MovedRef);
		expect(Stateful2Ref).to.equal(Stateful2MovedRef);
	});

	it('should effectively iterate on large lists', done => {
		const newItems = () =>
			Array(100)
				.fill(0)
				.map((item, i) => i);

		let set,
			mutatedNodes = [];

		class App extends Component {
			constructor(props) {
				super(props);
				this.state = { items: newItems() };
				set = this.set = this.set.bind(this);
				this.ref = createRef();
			}

			componentDidMount() {
				const observer = new MutationObserver(listener);
				observer.observe(this.ref.current, { childList: true });

				function listener(mutations) {
					for (const { addedNodes } of mutations) {
						for (const node of Array.from(addedNodes)) {
							mutatedNodes.push(node);
						}
					}
				}
			}

			set() {
				const currentItems = this.state.items;
				const items = newItems().filter(id => {
					const isVisible = currentItems.includes(id);
					return id >= 20 && id <= 80 ? !isVisible : isVisible;
				});
				this.setState({ items });
			}

			render() {
				return (
					<div ref={this.ref}>
						{this.state.items.map(i => (
							<div key={i}>{i}</div>
						))}
					</div>
				);
			}
		}

		render(<App />, scratch);

		set();
		rerender();

		setTimeout(() => {
			expect(mutatedNodes.length).to.equal(0);
			done();
		});
	});

	it('should effectively iterate on large component lists', done => {
		const newItems = () =>
			Array(100)
				.fill(0)
				.map((item, i) => i);

		let set,
			mutatedNodes = [];

		const Row = ({ i }) => <p>{i}</p>;

		class App extends Component {
			constructor(props) {
				super(props);
				this.state = { items: newItems() };
				set = this.set = this.set.bind(this);
				this.ref = createRef();
			}

			componentDidMount() {
				const observer = new MutationObserver(listener);
				observer.observe(this.ref.current, { childList: true });

				function listener(mutations) {
					for (const { addedNodes } of mutations) {
						for (const node of Array.from(addedNodes)) {
							mutatedNodes.push(node);
						}
					}
				}
			}

			set() {
				const currentItems = this.state.items;
				const items = newItems().filter(id => {
					const isVisible = currentItems.includes(id);
					return id >= 20 && id <= 80 ? !isVisible : isVisible;
				});
				this.setState({ items });
			}

			render() {
				return (
					<div ref={this.ref}>
						{this.state.items.map(i => (
							<Row key={i} i={i} />
						))}
					</div>
				);
			}
		}

		render(<App />, scratch);

		set();
		rerender();

		setTimeout(() => {
			expect(mutatedNodes.length).to.equal(0);
			done();
		});
	});

	it('should not preserve state when switching between keyed and unkeyed components as children', () => {
		// React & Preact v8 behavior: https://codesandbox.io/s/8l3p6lz9kj

		const Stateful1 = createStateful('Stateful1');
		const Stateful2 = createStateful('Stateful2');

		let Stateful1Ref;
		let Stateful2Ref;
		let Stateful1MovedRef;
		let Stateful2MovedRef;

		function Foo({ unkeyed }) {
			return unkeyed ? (
				<div>
					<div>1</div>
					<Stateful1 ref={c => (Stateful2MovedRef = c)} />
					<div>2</div>
					<Stateful2 ref={c => (Stateful1MovedRef = c)} />
				</div>
			) : (
				<div>
					<div>1</div>
					<Stateful1 key="a" ref={c => (Stateful1Ref = c)} />
					<div>2</div>
					<Stateful2 key="b" ref={c => (Stateful2Ref = c)} />
				</div>
			);
		}

		const expectedHtml = div([
			div(1),
			div('Stateful1'),
			div(2),
			div('Stateful2')
		]);

		ops = [];
		render(<Foo unkeyed={false} />, scratch);

		expect(scratch.innerHTML).to.equal(expectedHtml);
		expect(ops).to.deep.equal(['Mount Stateful1', 'Mount Stateful2']);
		expect(Stateful1Ref).to.exist;
		expect(Stateful2Ref).to.exist;

		ops = [];
		render(<Foo unkeyed />, scratch);

		expect(scratch.innerHTML).to.equal(expectedHtml);
		expect(ops).to.deep.equal([
			'Unmount Stateful1',
			'Unmount Stateful2',
			'Mount Stateful1',
			'Mount Stateful2'
		]);
		expect(Stateful1MovedRef).to.not.equal(Stateful1Ref);
		expect(Stateful2MovedRef).to.not.equal(Stateful2Ref);

		ops = [];
		render(<Foo unkeyed={false} />, scratch);

		expect(scratch.innerHTML).to.equal(expectedHtml);
		expect(ops).to.deep.equal([
			'Unmount Stateful1',
			'Unmount Stateful2',
			'Mount Stateful1',
			'Mount Stateful2'
		]);
		expect(Stateful1Ref).to.not.equal(Stateful1MovedRef);
		expect(Stateful2Ref).to.not.equal(Stateful2MovedRef);
	});

	it('should handle full reorders', () => {
		const keys = {
			Apple: `Apple_1`,
			Orange: `Orange_1`,
			Banana: `Banana_1`,
			Grape: `Grape_1`,
			Kiwi: `Kiwi_1`,
			Cherry: `Cherry_1`
		};

		let sort;

		class App extends Component {
			order;

			state = { items: ['Apple', 'Grape', 'Cherry', 'Orange', 'Banana'] };

			sort() {
				this.order = this.order === 'ASC' ? 'DESC' : 'ASC';
				const items = [...this.state.items].sort((a, b) =>
					this.order === 'ASC' ? a.localeCompare(b) : b.localeCompare(a)
				);
				this.setState({ items });
			}

			render(_, { items }) {
				sort = this.sort.bind(this);
				return (
					<div>
						{items.map(item => (
							<div key={keys[item]}>{item}</div>
						))}
					</div>
				);
			}
		}

		const expected = values => {
			return values.map(key => `<div>${key}</div>`).join('');
		};

		render(<App />, scratch);
		expect(scratch.innerHTML).to.eq(
			`<div>${expected(['Apple', 'Grape', 'Cherry', 'Orange', 'Banana'])}</div>`
		);

		let sorted = ['Apple', 'Grape', 'Cherry', 'Orange', 'Banana'].sort((a, b) =>
			a.localeCompare(b)
		);
		sort();
		rerender();

		expect(scratch.innerHTML).to.eq(`<div>${expected(sorted)}</div>`);

		sorted = ['Apple', 'Grape', 'Cherry', 'Orange', 'Banana'].sort((a, b) =>
			b.localeCompare(a)
		);
		sort();
		rerender();

		expect(scratch.innerHTML).to.eq(`<div>${expected(sorted)}</div>`);
	});
});
