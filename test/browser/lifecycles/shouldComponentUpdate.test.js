import { setupRerender } from 'preact/test-utils';
import { createElement, render, Component, Fragment } from 'preact';
import { setupScratch, teardown } from '../../_util/helpers';
import { logCall, clearLog } from '../../_util/logCall';

/** @jsx createElement */

describe('Lifecycle methods', () => {
	/** @type {HTMLDivElement} */
	let scratch;

	/** @type {() => void} */
	let rerender;

	// function expectDomLogToBe(expectedOperations, message) {
	// 	expect(getLog()).to.deep.equal(expectedOperations, message);
	// }
	let resetInsertBefore;
	let resetRemoveChild;
	let resetRemove;

	before(() => {
		resetInsertBefore = logCall(Element.prototype, 'insertBefore');
		resetRemoveChild = logCall(Element.prototype, 'appendChild');
		resetRemove = logCall(Element.prototype, 'removeChild');
	});

	after(() => {
		resetInsertBefore();
		resetRemoveChild();
		resetRemove();
	});

	beforeEach(() => {
		scratch = setupScratch();
		rerender = setupRerender();

		clearLog();
	});

	afterEach(() => {
		teardown(scratch);
	});

	describe('#shouldComponentUpdate', () => {
		let setState;

		class Should extends Component {
			constructor() {
				super();
				this.state = { show: true };
				setState = s => this.setState(s);
			}
			render(props, { show }) {
				return show ? <div /> : null;
			}
		}

		class ShouldNot extends Should {
			shouldComponentUpdate() {
				return false;
			}
		}

		sinon.spy(Should.prototype, 'render');
		sinon.spy(ShouldNot.prototype, 'shouldComponentUpdate');

		beforeEach(() => Should.prototype.render.resetHistory());

		it('should rerender component on change by default', () => {
			render(<Should />, scratch);
			setState({ show: false });
			rerender();

			expect(Should.prototype.render).to.have.been.calledTwice;
		});

		it('should not rerender component if shouldComponentUpdate returns false', () => {
			render(<ShouldNot />, scratch);
			setState({ show: false });
			rerender();

			expect(ShouldNot.prototype.shouldComponentUpdate).to.have.been.calledOnce;
			expect(ShouldNot.prototype.render).to.have.been.calledOnce;
		});

		it('should reorder non-updating text children', () => {
			const rows = [
				{ id: '1', a: 5, b: 100 },
				{ id: '2', a: 50, b: 10 },
				{ id: '3', a: 25, b: 1000 }
			];

			class Row extends Component {
				shouldComponentUpdate(nextProps) {
					return nextProps.id !== this.props.id;
				}

				render() {
					return this.props.id;
				}
			}

			const App = ({ sortBy }) => (
				<div>
					<table>
						{rows
							.sort((a, b) => (a[sortBy] > b[sortBy] ? -1 : 1))
							.map(row => (
								<Row id={row.id} key={row.id} />
							))}
					</table>
				</div>
			);

			render(<App sortBy="a" />, scratch);
			expect(scratch.innerHTML).to.equal('<div><table>231</table></div>');

			render(<App sortBy="b" />, scratch);
			expect(scratch.innerHTML).to.equal('<div><table>312</table></div>');
		});

		it('should rerender when sCU returned false before', () => {
			let c;
			let spy = sinon.spy();

			class App extends Component {
				constructor() {
					super();
					c = this;
				}

				shouldComponentUpdate(_, nextState) {
					return !!nextState.update;
				}

				render() {
					spy();
					return <div>foo</div>;
				}
			}

			render(<App />, scratch);

			c.setState({});
			rerender();
			spy.resetHistory();

			c.setState({ update: true });
			rerender();
			expect(spy).to.be.calledOnce;
		});

		it('should be called with nextState', () => {
			let c;
			let spy = sinon.spy();

			class App extends Component {
				constructor() {
					super();
					c = this;
					this.state = { a: false };
				}

				shouldComponentUpdate(_, nextState) {
					return this.state !== nextState;
				}

				render() {
					spy();
					return <div>foo</div>;
				}
			}

			render(<App />, scratch);

			c.setState({});
			rerender();
			spy.resetHistory();

			c.setState({ a: true });
			rerender();
			expect(spy).to.be.calledOnce;
		});

		it('should clear renderCallbacks', () => {
			const spy = sinon.spy();
			let c,
				renders = 0;

			class App extends Component {
				constructor() {
					super();
					c = this;
					this.state = { a: false };
				}

				shouldComponentUpdate(_, nextState) {
					return false;
				}

				render() {
					renders += 1;
					return <div>foo</div>;
				}
			}

			render(<App />, scratch);
			expect(renders).to.equal(1);

			c.setState({}, spy);
			rerender();
			expect(renders).to.equal(1);
			expect(spy).to.be.calledOnce;
		});

		it('should not be called on forceUpdate', () => {
			let Comp;
			class Foo extends Component {
				constructor() {
					super();
					Comp = this;
				}

				shouldComponentUpdate() {
					return false;
				}

				render() {
					return <ShouldNot />;
				}
			}

			sinon.spy(Foo.prototype, 'shouldComponentUpdate');
			sinon.spy(Foo.prototype, 'render');

			render(<Foo />, scratch);
			Comp.forceUpdate();
			rerender();

			expect(Foo.prototype.shouldComponentUpdate).to.not.have.been.called;
			expect(Foo.prototype.render).to.have.been.calledTwice;
		});

		it('should not be called on forceUpdate followed by setState', () => {
			let Comp;
			class Foo extends Component {
				constructor() {
					super();
					Comp = this;
				}

				shouldComponentUpdate() {
					return false;
				}

				render() {
					return <ShouldNot />;
				}
			}

			sinon.spy(Foo.prototype, 'shouldComponentUpdate');
			sinon.spy(Foo.prototype, 'render');

			render(<Foo />, scratch);
			Comp.forceUpdate();
			Comp.setState({});
			rerender();

			expect(Foo.prototype.render).to.have.been.calledTwice;
			expect(Foo.prototype.shouldComponentUpdate).to.not.have.been.called;
		});

		it('should not block queued child forceUpdate', () => {
			let i = 0;
			let updateInner;
			class Inner extends Component {
				shouldComponentUpdate() {
					return i === 0;
				}
				render() {
					updateInner = () => this.forceUpdate();
					return <div>{++i}</div>;
				}
			}

			let updateOuter;
			class Outer extends Component {
				shouldComponentUpdate() {
					return i === 0;
				}
				render() {
					updateOuter = () => this.forceUpdate();
					return <Inner />;
				}
			}

			class App extends Component {
				render() {
					return <Outer />;
				}
			}

			render(<App />, scratch);

			updateOuter();
			updateInner();
			rerender();

			expect(scratch.textContent).to.equal('2');

			// The inner sCU should return false on second render because
			// it was not enqueued via forceUpdate
			updateOuter();
			rerender();
			expect(scratch.textContent).to.equal('2');
		});

		it('should be passed next props and state', () => {
			/** @type {() => void} */
			let updateState;

			let curProps;
			let curState;
			let nextPropsArg;
			let nextStateArg;

			class Foo extends Component {
				constructor(props) {
					super(props);
					this.state = {
						value: 0
					};
					updateState = () =>
						this.setState({
							value: this.state.value + 1
						});
				}
				static getDerivedStateFromProps(props, state) {
					// NOTE: Don't do this in real production code!
					// https://reactjs.org/blog/2018/06/07/you-probably-dont-need-derived-state.html
					return {
						value: state.value + 1
					};
				}
				shouldComponentUpdate(nextProps, nextState) {
					nextPropsArg = { ...nextProps };
					nextStateArg = { ...nextState };

					curProps = { ...this.props };
					curState = { ...this.state };

					return true;
				}
				render() {
					return <div>{this.state.value}</div>;
				}
			}

			// Expectation:
			// `this.state` in shouldComponentUpdate should be
			// the state before setState or getDerivedStateFromProps was called
			// `nextState` in shouldComponentUpdate should be
			// the updated state after getDerivedStateFromProps was called

			// Initial render
			// state.value: initialized to 0 in constructor, 0 -> 1 in gDSFP
			render(<Foo foo="foo" />, scratch);
			expect(scratch.firstChild.textContent).to.be.equal('1');
			expect(curProps).to.be.undefined;
			expect(curState).to.be.undefined;
			expect(nextPropsArg).to.be.undefined;
			expect(nextStateArg).to.be.undefined;

			// New props
			// state.value: 1 -> 2 in gDSFP
			render(<Foo foo="bar" />, scratch);
			expect(scratch.firstChild.textContent).to.be.equal('2');
			expect(curProps).to.deep.equal({ foo: 'foo' });
			expect(curState).to.deep.equal({ value: 1 });
			expect(nextPropsArg).to.deep.equal({ foo: 'bar' });
			expect(nextStateArg).to.deep.equal({ value: 2 });

			// New state
			// state.value: 2 -> 3 in updateState, 3 -> 4 in gDSFP
			updateState();
			rerender();

			expect(scratch.firstChild.textContent).to.be.equal('4');
			expect(curProps).to.deep.equal({ foo: 'bar' });
			expect(curState).to.deep.equal({ value: 2 });
			expect(nextPropsArg).to.deep.equal({ foo: 'bar' });
			expect(nextStateArg).to.deep.equal({ value: 4 });
		});

		it('should update props reference when sCU returns false', () => {
			let spy = sinon.spy();

			let updateState;
			class Foo extends Component {
				constructor() {
					super();
					updateState = () => this.setState({});
				}

				shouldComponentUpdate(nextProps) {
					if (nextProps !== this.props) {
						spy();
						return false;
					}
					return true;
				}
			}

			render(<Foo foo="foo" />, scratch);
			render(<Foo foo="bar" />, scratch);
			expect(spy).to.be.calledOnce;

			updateState();
			rerender();

			expect(spy).to.be.calledOnce;
		});

		it('should update state reference when sCU returns false', () => {
			let spy = sinon.spy();

			let updateState;
			class Foo extends Component {
				constructor() {
					super();
					this.state = { foo: 1 };
					updateState = () => this.setState({ foo: 2 });
				}

				shouldComponentUpdate(_, nextState) {
					if (nextState !== this.state) {
						spy(this.state, nextState);
						return false;
					}
					return true;
				}
			}

			render(<Foo />, scratch);
			updateState();
			rerender();

			expect(spy).to.be.calledOnce;
			expect(spy).to.be.calledWithMatch({ foo: 1 }, { foo: 2 });

			updateState();
			rerender();

			expect(spy).to.be.calledWithMatch({ foo: 2 }, { foo: 2 });
			expect(spy).to.be.calledTwice;
		});

		// issue #1864
		it('should update dom pointers correctly when returning an empty string', () => {
			function Child({ showMe, counter }) {
				return showMe ? <div>Counter: {counter}</div> : '';
			}

			class Parent extends Component {
				shouldComponentUpdate() {
					return false;
				}
				render() {
					return <Inner />;
				}
			}

			let updateChild = () => null;
			class Inner extends Component {
				constructor(props) {
					super(props);
					this.state = { showMe: false };
					updateChild = () => {
						this.setState({ showMe: (display = !display) });
					};
				}
				render() {
					return <Child showMe={this.state.showMe} counter={0} />;
				}
			}

			let display = false;
			let updateApp = () => null;
			class App extends Component {
				constructor(props) {
					super(props);
					updateApp = () => this.setState({});
				}
				render() {
					return (
						<div>
							<div />
							<div />
							<Parent />
						</div>
					);
				}
			}

			render(<App />, scratch);
			expect(scratch.textContent).to.equal('');

			updateChild();
			rerender();

			expect(scratch.textContent).to.equal('Counter: 0');

			updateApp();
			rerender();

			expect(scratch.textContent).to.equal('Counter: 0');

			updateChild();
			rerender();

			expect(scratch.textContent).to.equal('');

			updateApp();
			rerender();
			expect(scratch.textContent).to.equal('');
		});

		// issue #1864 second case
		it('should update dom pointers correctly when returning a string', () => {
			function Child({ showMe, counter }) {
				return showMe ? <div>Counter: {counter}</div> : 'foo';
			}

			class Parent extends Component {
				shouldComponentUpdate() {
					return false;
				}
				render() {
					return <Inner />;
				}
			}

			let updateChild = () => null;
			class Inner extends Component {
				constructor(props) {
					super(props);
					this.state = { showMe: false };
					updateChild = () => {
						this.setState({ showMe: (display = !display) });
					};
				}
				render() {
					return <Child showMe={this.state.showMe} counter={0} />;
				}
			}

			let display = false;
			let updateApp = () => null;
			class App extends Component {
				constructor(props) {
					super(props);
					updateApp = () => this.setState({});
				}
				render() {
					return (
						<div>
							<div />
							<div />
							<Parent />
						</div>
					);
				}
			}

			render(<App />, scratch);
			expect(scratch.textContent).to.equal('foo');

			updateChild();
			rerender();

			expect(scratch.textContent).to.equal('Counter: 0');

			updateApp();
			rerender();

			expect(scratch.textContent).to.equal('Counter: 0');

			updateChild();
			rerender();

			expect(scratch.textContent).to.equal('foo');

			updateApp();
			rerender();
			expect(scratch.textContent).to.equal('foo');
		});

		it('should correctly update nested children', () => {
			let hideThree, incrementThree;

			class One extends Component {
				shouldComponentUpdate() {
					return false;
				}
				render(p) {
					return p.children;
				}
			}

			class Two extends Component {
				constructor(props) {
					super(props);
					this.state = { hideMe: false };
					hideThree = () => this.setState(s => ({ hideMe: !s.hideMe }));
				}

				shouldComponentUpdate(nextProps, nextState) {
					return this.state.hideMe !== nextState.hideMe;
				}

				render(p, { hideMe }) {
					return hideMe ? <Fragment /> : p.children;
				}
			}

			class Three extends Component {
				constructor(props) {
					super(props);
					this.state = { counter: 1 };
					incrementThree = () =>
						this.setState(s => ({ counter: s.counter + 1 }));
				}

				render(p, { counter }) {
					return <span>{counter}</span>;
				}
			}

			render(
				<One>
					<Two>
						<Three />
					</Two>
				</One>,
				scratch
			);
			expect(scratch.innerHTML).to.equal('<span>1</span>');

			hideThree();
			rerender();
			expect(scratch.innerHTML).to.equal('');

			hideThree();
			rerender();
			expect(scratch.innerHTML).to.equal('<span>1</span>');

			incrementThree();
			rerender();
			expect(scratch.innerHTML).to.equal('<span>2</span>');
		});

		// issue #1864 third case
		it('should update dom pointers correctly without siblings', () => {
			function Child({ showMe, counter }) {
				return showMe ? <div>Counter: {counter}</div> : 'foo';
			}

			class Parent extends Component {
				shouldComponentUpdate() {
					return false;
				}
				render() {
					return <Inner />;
				}
			}

			let updateChild = () => null;
			class Inner extends Component {
				constructor(props) {
					super(props);
					this.state = { showMe: false };
					updateChild = () => {
						this.setState({ showMe: (display = !display) });
					};
				}
				render() {
					return <Child showMe={this.state.showMe} counter={0} />;
				}
			}

			let display = false;
			let updateApp = () => null;
			class App extends Component {
				constructor(props) {
					super(props);
					updateApp = () => this.setState({});
				}
				render() {
					return (
						<div>
							<Parent />
						</div>
					);
				}
			}

			render(<App />, scratch);
			expect(scratch.textContent).to.equal('foo');

			updateChild();
			rerender();

			expect(scratch.textContent).to.equal('Counter: 0');

			updateApp();
			rerender();

			expect(scratch.textContent).to.equal('Counter: 0');

			updateChild();
			rerender();

			expect(scratch.textContent).to.equal('foo');

			updateApp();
			rerender();

			expect(scratch.textContent).to.equal('foo');
		});
	});

	it('should correctly render when sCU component has null children', () => {
		class App extends Component {
			shouldComponentUpdate() {
				return false;
			}
			render() {
				return [null, <div>Hello World!</div>, null];
			}
		}

		render(<App />, scratch);
		expect(scratch.innerHTML).to.equal('<div>Hello World!</div>');

		render(<App />, scratch);
		expect(scratch.innerHTML).to.equal('<div>Hello World!</div>');

		render(<App />, scratch);
		expect(scratch.innerHTML).to.equal('<div>Hello World!</div>');
	});

	it('should support nested update with strict-equal vnodes', () => {
		let wrapperSetState, childSetState;

		class Child extends Component {
			constructor(props) {
				super(props);
				this.state = { foo: 'baz' };
			}

			render() {
				childSetState = this.setState.bind(this);
				return <p>{this.state.foo}</p>;
			}
		}

		class Wrapper extends Component {
			render() {
				wrapperSetState = this.setState.bind(this);
				return this.props.children;
			}
		}

		const App = () => (
			<Wrapper>
				<Child />
			</Wrapper>
		);

		render(<App />, scratch);
		expect(scratch.innerHTML).to.equal('<p>baz</p>');

		wrapperSetState({ hi: 'world' });
		childSetState({ foo: 'bar' });
		rerender();
		expect(scratch.innerHTML).to.equal('<p>bar</p>');
	});

	it('should reorder non-updating nested Fragment children', () => {
		const rows = [
			{ id: '1', a: 5, b: 100 },
			{ id: '2', a: 50, b: 10 },
			{ id: '3', a: 25, b: 1000 }
		];

		function Cell({ id, a, b }) {
			// Return an array to really test out the reordering algorithm :)
			return (
				<Fragment>
					<div>id: {id}</div>
					<Fragment>
						<div>a: {a}</div>
						<div>b: {b}</div>
					</Fragment>
				</Fragment>
			);
		}

		class Row extends Component {
			shouldComponentUpdate(nextProps) {
				return nextProps.id !== this.props.id;
			}

			render(props) {
				return <Cell id={props.id} a={props.a} b={props.b} />;
			}
		}

		const App = ({ sortBy }) => (
			<div>
				<table>
					{rows
						.sort((a, b) => (a[sortBy] > b[sortBy] ? -1 : 1))
						.map(row => (
							<Row key={row.id} id={row.id} a={row.a} b={row.b} />
						))}
				</table>
			</div>
		);

		render(<App sortBy="a" />, scratch);
		expect(scratch.innerHTML).to.equal(
			`<div><table>${[
				'<div>id: 2</div><div>a: 50</div><div>b: 10</div>',
				'<div>id: 3</div><div>a: 25</div><div>b: 1000</div>',
				'<div>id: 1</div><div>a: 5</div><div>b: 100</div>'
			].join('')}</table></div>`
		);

		clearLog();
		render(<App sortBy="b" />, scratch);
		expect(scratch.innerHTML).to.equal(
			`<div><table>${[
				'<div>id: 3</div><div>a: 25</div><div>b: 1000</div>',
				'<div>id: 1</div><div>a: 5</div><div>b: 100</div>',
				'<div>id: 2</div><div>a: 50</div><div>b: 10</div>'
			].join('')}</table></div>`
		);
		// TODO: these tests pass in isolation but not when all tests are running, figure out why logCall stops appending to log.
		// expectDomLogToBe([
		// 	'<table>id: 2a: 50b: 10id: 3a: 25b: 1000id: 1a: 5b: 100.insertBefore(<div>id: 3, <div>id: 2)',
		// 	'<table>id: 3id: 2a: 50b: 10a: 25b: 1000id: 1a: 5b: 100.insertBefore(<div>a: 25, <div>id: 2)',
		// 	'<table>id: 3a: 25id: 2a: 50b: 10b: 1000id: 1a: 5b: 100.insertBefore(<div>b: 1000, <div>id: 2)',
		// 	'<table>id: 3a: 25b: 1000id: 2a: 50b: 10id: 1a: 5b: 100.insertBefore(<div>id: 1, <div>id: 2)',
		// 	'<table>id: 3a: 25b: 1000id: 1id: 2a: 50b: 10a: 5b: 100.insertBefore(<div>a: 5, <div>id: 2)',
		// 	'<table>id: 3a: 25b: 1000id: 1a: 5id: 2a: 50b: 10b: 100.insertBefore(<div>b: 100, <div>id: 2)'
		// ]);
	});

	it('should correctly handle double state updates', () => {
		let updateParent, updateChild;
		class Parent extends Component {
			state = { text: 'parent-old' };

			componentDidMount() {
				updateParent = () => this.setState({ text: 'Parent-NEW' });
			}

			render() {
				return (
					<Fragment>
						{this.props.children} and {this.state.text}
					</Fragment>
				);
			}
		}

		class Child extends Component {
			state = { text: 'child-old' };

			shouldComponentUpdate(nextProps, nextState) {
				return this.state.text !== nextState.text;
			}

			componentDidMount() {
				updateChild = () => this.setState({ text: 'Child-NEW' });
			}

			render() {
				return <h1>{this.state.text}</h1>;
			}
		}

		render(
			<Parent>
				<Child />
			</Parent>,
			scratch
		);

		updateParent();
		updateChild();
		rerender();
		expect(scratch.innerHTML).to.equal('<h1>Child-NEW</h1> and Parent-NEW');
	});

	it('should maintain the order if memoised component initially rendered empty content', () => {
		let showText, updateParent;
		class Child extends Component {
			constructor(props) {
				super(props);
				this.state = {
					show: false
				};
				showText = () => this.setState({ show: true });
			}
			render(props, { show }) {
				if (!show) return null;

				return <div>Component</div>;
			}
		}

		class Memoized extends Component {
			shouldComponentUpdate() {
				return false;
			}
			render() {
				return <Child />;
			}
		}
		class Parent extends Component {
			constructor(props) {
				super(props);
				updateParent = () => this.setState({});
			}
			render() {
				return (
					<Fragment>
						<div>Before</div>
						<Memoized />
						<div>After</div>
					</Fragment>
				);
			}
		}

		render(<Parent />, scratch);
		expect(scratch.innerHTML).to.equal(`<div>Before</div><div>After</div>`);

		updateParent();
		rerender();
		expect(scratch.innerHTML).to.equal(`<div>Before</div><div>After</div>`);

		showText();
		rerender();

		expect(scratch.innerHTML).to.equal(
			`<div>Before</div><div>Component</div><div>After</div>`
		);
	});
});
