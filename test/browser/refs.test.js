import { setupRerender } from 'preact/test-utils';
import { createElement, render, Component, createRef, Fragment } from 'preact';
import { setupScratch, teardown } from '../_util/helpers';

/** @jsx createElement */

// gives call count and argument errors names (otherwise sinon just uses "spy"):
let spy = (name, ...args) => {
	let spy = sinon.spy(...args);
	spy.displayName = `spy('${name}')`;
	return spy;
};

describe('refs', () => {
	let scratch;
	let rerender;

	beforeEach(() => {
		scratch = setupScratch();
		rerender = setupRerender();
	});

	afterEach(() => {
		teardown(scratch);
	});

	it('should invoke refs in render()', () => {
		let ref = spy('ref');
		render(<div ref={ref} />, scratch);
		expect(ref).to.have.been.calledOnce.and.calledWith(scratch.firstChild);
	});

	it('should not call stale refs', () => {
		let ref = spy('ref');
		let ref2 = spy('ref2');
		let bool = true;
		const App = () => <div ref={bool ? ref : ref2} />;

		render(<App />, scratch);
		expect(ref).to.have.been.calledOnce.and.calledWith(scratch.firstChild);

		bool = false;
		render(<App />, scratch);
		expect(ref).to.have.been.calledTwice.and.calledWith(null);
		expect(ref2).to.have.been.calledOnce.and.calledWith(scratch.firstChild);
	});

	it('should support createRef', () => {
		const r = createRef();
		expect(r.current).to.equal(null);

		render(<div ref={r} />, scratch);
		expect(r.current).to.equalNode(scratch.firstChild);
	});

	it('should invoke refs in Component.render()', () => {
		let outer = spy('outer'),
			inner = spy('inner');
		class Foo extends Component {
			render() {
				return (
					<div ref={outer}>
						<span ref={inner} />
					</div>
				);
			}
		}
		render(<Foo />, scratch);

		expect(outer).to.have.been.calledWith(scratch.firstChild);
		expect(inner).to.have.been.calledWith(scratch.firstChild.firstChild);
	});

	it('should pass component refs in props', () => {
		let ref = spy('ref'),
			instance;
		class Foo extends Component {
			constructor() {
				super();
			}
			render(props) {
				instance = props.ref;
				return <div />;
			}
		}
		render(<Foo ref={ref} />, scratch);

		expect(ref).to.equal(instance);
	});

	it('should have a consistent order', () => {
		const events = [];
		const App = () => (
			<div ref={r => events.push('called with ' + (r && r.tagName))}>
				<h1 ref={r => events.push('called with ' + (r && r.tagName))}>hi</h1>
			</div>
		);

		render(<App />, scratch);
		render(<App />, scratch);
		expect(events.length).to.equal(6);
		expect(events).to.deep.equal([
			'called with H1',
			'called with DIV',
			'called with null',
			'called with null',
			'called with H1',
			'called with DIV'
		]);
	});

	// Test for #232
	it('should only null refs after unmount', () => {
		let outer, inner;

		class TestUnmount extends Component {
			componentWillUnmount() {
				expect(this).to.have.property('outer', outer);
				expect(this).to.have.property('inner', inner);

				setTimeout(() => {
					expect(this).to.have.property('outer', null);
					expect(this).to.have.property('inner', null);
				});
			}

			render() {
				return (
					<div id="outer" ref={c => (this.outer = c)}>
						<div id="inner" ref={c => (this.inner = c)} />
					</div>
				);
			}
		}

		sinon.spy(TestUnmount.prototype, 'componentWillUnmount');

		render(
			<div>
				<TestUnmount />
			</div>,
			scratch
		);
		outer = scratch.querySelector('#outer');
		inner = scratch.querySelector('#inner');

		expect(TestUnmount.prototype.componentWillUnmount).not.to.have.been.called;

		render(<div />, scratch);
		expect(TestUnmount.prototype.componentWillUnmount).to.have.been.calledOnce;
	});

	it('should null and re-invoke refs when swapping component root element type', () => {
		/** @type {Child} */
		let inst;

		class App extends Component {
			render() {
				return (
					<div>
						<Child />
					</div>
				);
			}
		}

		class Child extends Component {
			constructor(props, context) {
				super(props, context);
				this.state = { show: false };
				inst = this;
			}
			handleMount() {}
			render(_, { show }) {
				if (!show) return <div id="div" ref={this.handleMount} />;
				return (
					<span id="span" ref={this.handleMount}>
						some test content
					</span>
				);
			}
		}
		sinon.spy(Child.prototype, 'handleMount');

		render(<App />, scratch);
		expect(inst.handleMount).to.have.been.calledOnce.and.calledWith(
			scratch.querySelector('#div')
		);
		inst.handleMount.resetHistory();

		inst.setState({ show: true });
		rerender();
		expect(inst.handleMount).to.have.been.calledTwice;
		expect(inst.handleMount.firstCall).to.have.been.calledWith(null);
		expect(inst.handleMount.secondCall).to.have.been.calledWith(
			scratch.querySelector('#span')
		);
		inst.handleMount.resetHistory();

		inst.setState({ show: false });
		rerender();
		expect(inst.handleMount).to.have.been.calledTwice;
		expect(inst.handleMount.firstCall).to.have.been.calledWith(null);
		expect(inst.handleMount.secondCall).to.have.been.calledWith(
			scratch.querySelector('#div')
		);
	});

	// Test for #1177
	it('should call ref after children are rendered', done => {
		/** @type {HTMLInputElement} */
		let input;
		function autoFocus(el) {
			if (el) {
				input = el;

				// Chrome bug: It will somehow drop the focus event if it fires too soon.
				// See https://stackoverflow.com/questions/17384464/
				setTimeout(() => {
					el.focus();
					done();
				}, 1);
			}
		}

		render(<input type="text" ref={autoFocus} value="foo" />, scratch);
		expect(input.value).to.equal('foo');
	});

	it('should correctly set nested child refs', () => {
		const ref = createRef();
		const App = ({ open }) =>
			open ? (
				<div class="open" key="open">
					<div ref={ref} />
				</div>
			) : (
				<div class="closes" key="closed">
					<div ref={ref} />
				</div>
			);

		render(<App />, scratch);
		expect(ref.current).to.not.be.null;

		render(<App open />, scratch);
		expect(ref.current).to.not.be.null;
	});

	it('should correctly call child refs for un-keyed children on re-render', () => {
		let el = null;
		let ref = e => {
			el = e;
		};

		class App extends Component {
			render({ headerVisible }) {
				return (
					<div>
						{headerVisible && <div>foo</div>}
						<div ref={ref}>bar</div>
					</div>
				);
			}
		}

		render(<App headerVisible />, scratch);
		expect(el).to.not.be.equal(null);

		render(<App />, scratch);
		expect(el).to.not.be.equal(null);
	});

	it('should not remove refs for memoized components keyed', () => {
		const ref = createRef();
		const element = <div ref={ref}>hey</div>;
		function App(props) {
			return <div key={props.count}>{element}</div>;
		}

		render(<App count={0} />, scratch);
		expect(ref.current).to.equal(scratch.firstChild.firstChild);
		render(<App count={1} />, scratch);
		expect(ref.current).to.equal(scratch.firstChild.firstChild);
		render(<App count={2} />, scratch);
		expect(ref.current).to.equal(scratch.firstChild.firstChild);
	});

	it('should not remove refs for memoized components unkeyed', () => {
		const ref = createRef();
		const element = <div ref={ref}>hey</div>;
		function App(props) {
			return <div>{element}</div>;
		}

		render(<App count={0} />, scratch);
		expect(ref.current).to.equal(scratch.firstChild.firstChild);
		render(<App count={1} />, scratch);
		expect(ref.current).to.equal(scratch.firstChild.firstChild);
		render(<App count={2} />, scratch);
		expect(ref.current).to.equal(scratch.firstChild.firstChild);
	});

	it('should properly call null for memoized components keyed', () => {
		let calls = [];
		const element = <div ref={x => calls.push(x)}>hey</div>;
		function App(props) {
			return <div key={props.count}>{element}</div>;
		}

		render(<App count={0} />, scratch);
		expect(calls).to.deep.equal([scratch.firstChild.firstChild]);
		calls = [];

		render(<App count={1} />, scratch);
		expect(calls).to.deep.equal([null, scratch.firstChild.firstChild]);
		calls = [];

		render(<App count={2} />, scratch);
		expect(calls).to.deep.equal([null, scratch.firstChild.firstChild]);
	});

	it('should properly call null for memoized components unkeyed', () => {
		const calls = [];
		const element = <div ref={x => calls.push(x)}>hey</div>;
		function App(props) {
			return <div>{element}</div>;
		}

		render(<App count={0} />, scratch);
		render(<App count={1} />, scratch);
		render(<App count={2} />, scratch);
		expect(calls.length).to.equal(1);
		expect(calls[0]).to.equal(scratch.firstChild.firstChild);
	});

	// Test for #4049
	it('should first clean-up refs and after apply them', () => {
		let calls = [];
		/** @type {() => void} */
		let set;
		class App extends Component {
			constructor(props) {
				super(props);
				this.state = {
					phase: 1
				};
				set = () => this.setState({ phase: 2 });
			}

			render(props, { phase }) {
				return (
					<Fragment>
						{phase === 1 ? (
							<div>
								<div
									ref={r =>
										r
											? calls.push('adding ref to two')
											: calls.push('removing ref from two')
									}
								>
									Element two
								</div>
								<div
									ref={r =>
										r
											? calls.push('adding ref to three')
											: calls.push('removing ref from three')
									}
								>
									Element three
								</div>
							</div>
						) : phase === 2 ? (
							<div class="outer">
								<div
									ref={r =>
										r
											? calls.push('adding ref to one')
											: calls.push('removing ref from one')
									}
								>
									Element one
								</div>
								<div class="wrapper">
									<div
										ref={r =>
											r
												? calls.push('adding ref to two')
												: calls.push('removing ref from two')
										}
									>
										Element two
									</div>
									<div
										ref={r =>
											r
												? calls.push('adding ref to three')
												: calls.push('removing ref from three')
										}
									>
										Element three
									</div>
								</div>
							</div>
						) : null}
					</Fragment>
				);
			}
		}

		render(<App />, scratch);

		expect(calls).to.deep.equal(['adding ref to two', 'adding ref to three']);
		calls = [];

		set();
		rerender();
		expect(calls).to.deep.equal([
			'removing ref from two',
			'adding ref to one',
			'adding ref to two',
			'adding ref to three'
		]);
	});

	it('should bind refs before componentDidMount', () => {
		/** @type {import('preact').RefObject<HTMLSpanElement>[]} */
		const refs = [];

		class Parent extends Component {
			componentDidMount() {
				// Child refs should be set
				expect(refs.length).to.equal(2);
				expect(refs[0].current.tagName).to.equal('SPAN');
				expect(refs[1].current.tagName).to.equal('SPAN');
			}

			render(props) {
				return props.children;
			}
		}

		class Child extends Component {
			constructor(props) {
				super(props);

				this.ref = createRef();
			}

			componentDidMount() {
				// SPAN refs should be set
				expect(this.ref.current.tagName).to.equal('SPAN');
				expect(document.body.contains(this.ref.current)).to.equal(true);
				refs.push(this.ref);
			}

			render() {
				return <span ref={this.ref}>Hello</span>;
			}
		}

		render(
			<Parent>
				<Child />
				<Child />
			</Parent>,
			scratch
		);

		expect(scratch.innerHTML).to.equal('<span>Hello</span><span>Hello</span>');
		expect(refs[0].current).to.equalNode(scratch.firstChild);
		expect(refs[1].current).to.equalNode(scratch.lastChild);
	});

	it('should call refs after element is added to document on initial mount', () => {
		const verifyRef = name => el =>
			expect(document.body.contains(el), name).to.equal(true);

		function App() {
			return (
				<div ref={verifyRef('div tag')}>
					<p ref={verifyRef('p tag')}>Hello</p>
				</div>
			);
		}

		render(<App />, scratch);
	});

	it('should call refs after element is added to document on update', () => {
		const verifyRef = name => el =>
			expect(document.body.contains(el), name).to.equal(true);

		function App({ show = false }) {
			return (
				<div>
					{show && (
						<p ref={verifyRef('p tag')}>
							<span ref={verifyRef('inner span')}>Hello</span>
						</p>
					)}
				</div>
			);
		}

		render(<App />, scratch);
		render(<App show />, scratch);
	});

	it('should call ref cleanup on unmount', () => {
		const cleanup = sinon.spy();
		const ref = sinon.spy(() => cleanup);

		function App({ show = false }) {
			return <div>{show && <p ref={ref}>hello</p>}</div>;
		}

		render(<App show />, scratch);
		render(<App />, scratch);

		expect(cleanup).to.be.calledOnce;

		// Ref should not be called with `null` when cleanup is present
		expect(ref).to.be.calledOnce;
		expect(ref).not.to.be.calledWith(null);
	});

	it('should call ref cleanup when ref changes', () => {
		const cleanup = sinon.spy();

		function App({ show = false, count = 0 }) {
			return <div>{show && <p ref={() => cleanup}>hello {count}</p>}</div>;
		}

		render(<App show />, scratch);
		render(<App show count={1} />, scratch);

		// Cleanup should be invoked whenever ref function changes
		expect(cleanup).to.be.calledOnce;
	});
});
