import { createElement, Component, render } from 'preact';
import { setupScratch, teardown } from '../_util/helpers';
import { logCall, clearLog, getLog } from '../_util/logCall';
import { div } from '../_util/dom';

/** @jsx createElement */

describe('keys', () => {
	/** @type {HTMLDivElement} */
	let scratch;

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

	before(() => {
		logCall(Element.prototype, 'appendChild');
		logCall(Element.prototype, 'insertBefore');
		logCall(Element.prototype, 'removeChild');
		logCall(Element.prototype, 'remove');
	});

	beforeEach(() => {
		scratch = setupScratch();
		ops = [];
	});

	afterEach(() => {
		teardown(scratch);
		clearLog();
	});

	// https://fb.me/react-special-props
	it('should not pass key in props', () => {
		const Foo = sinon.spy(() => null);
		render(<Foo key="foo" />, scratch);
		expect(Foo.args[0][0]).to.deep.equal({});
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
			'<li>z.remove()',
			'<li>y.remove()',
			'<li>x.remove()'
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

	it('should reverse keyed children effectively', () => {
		const values = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'];

		render(<List values={values} />, scratch);
		expect(scratch.textContent).to.equal(values.join(''));

		// reverse list
		values.reverse();
		clearLog();

		render(<List values={values} />, scratch);
		expect(scratch.textContent).to.equal(values.join(''));
		expect(getLog()).to.deep.equal([
			'<ol>abcdefghij.insertBefore(<li>j, <li>a)',
			'<ol>jabcdefghi.insertBefore(<li>i, <li>a)',
			'<ol>jiabcdefgh.insertBefore(<li>h, <li>a)',
			'<ol>jihabcdefg.insertBefore(<li>g, <li>a)',
			'<ol>jihgabcdef.appendChild(<li>e)',
			'<ol>jihgabcdfe.appendChild(<li>d)',
			'<ol>jihgabcfed.appendChild(<li>c)',
			'<ol>jihgabfedc.appendChild(<li>b)',
			'<ol>jihgafedcb.appendChild(<li>a)'
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
			'Unmount Stateful2',
			'Unmount Stateful1',
			'Mount Stateful1',
			'Mount Stateful2'
		]);
		expect(Stateful1MovedRef).to.not.equal(Stateful1Ref);
		expect(Stateful2MovedRef).to.not.equal(Stateful2Ref);

		ops = [];
		render(<Foo moved={false} />, scratch);

		expect(scratch.innerHTML).to.equal(expectedHtml);
		expect(ops).to.deep.equal([
			'Unmount Stateful2',
			'Unmount Stateful1',
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
			'Unmount Stateful2',
			'Unmount Stateful1',
			'Mount Stateful1',
			'Mount Stateful2'
		]);
		expect(Stateful1MovedRef).to.not.equal(Stateful1Ref);
		expect(Stateful2MovedRef).to.not.equal(Stateful2Ref);

		ops = [];
		render(<Foo unkeyed={false} />, scratch);

		expect(scratch.innerHTML).to.equal(expectedHtml);
		expect(ops).to.deep.equal([
			'Unmount Stateful2',
			'Unmount Stateful1',
			'Mount Stateful1',
			'Mount Stateful2'
		]);
		expect(Stateful1Ref).to.not.equal(Stateful1MovedRef);
		expect(Stateful2Ref).to.not.equal(Stateful2MovedRef);
	});
});
