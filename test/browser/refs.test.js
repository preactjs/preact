import { setupRerender } from 'preact/test-utils';
import { createElement, render, Component, createRef } from 'preact';
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

	it('should pass components to ref functions', () => {
		let ref = spy('ref'),
			instance;
		class Foo extends Component {
			constructor() {
				super();
				instance = this;
			}
			render() {
				return <div />;
			}
		}
		render(<Foo ref={ref} />, scratch);

		expect(ref).to.have.been.calledOnce.and.calledWith(instance);
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
			'called with H1',
			'called with null',
			'called with DIV'
		]);
	});

	it('should pass rendered DOM from functional components to ref functions', () => {
		let ref = spy('ref');

		const Foo = () => <div />;

		render(<Foo ref={ref} />, scratch);
		expect(ref).to.have.been.calledOnce;

		ref.resetHistory();
		render(<Foo ref={ref} />, scratch);
		expect(ref).not.to.have.been.called;

		ref.resetHistory();
		render(<span />, scratch);
		expect(ref).to.have.been.calledOnce.and.calledWith(null);
	});

	it('should pass children to ref functions', () => {
		let outer = spy('outer'),
			inner = spy('inner'),
			InnermostComponent = 'span',
			update,
			inst;
		class Outer extends Component {
			constructor() {
				super();
				update = () => this.forceUpdate();
			}
			render() {
				return (
					<div>
						<Inner ref={outer} />
					</div>
				);
			}
		}
		class Inner extends Component {
			constructor() {
				super();
				inst = this;
			}
			render() {
				return <InnermostComponent ref={inner} />;
			}
		}

		render(<Outer />, scratch);

		expect(outer).to.have.been.calledOnce.and.calledWith(inst);
		expect(inner).to.have.been.calledOnce.and.calledWith(inst.base);

		outer.resetHistory();
		inner.resetHistory();
		update();
		rerender();

		expect(outer, 're-render').not.to.have.been.called;
		expect(inner, 're-render').not.to.have.been.called;

		inner.resetHistory();
		InnermostComponent = 'x-span';
		update();
		rerender();

		expect(inner, 're-render swap');
		expect(inner.firstCall, 're-render swap').to.have.been.calledWith(null);
		expect(inner.secondCall, 're-render swap').to.have.been.calledWith(
			inst.base
		);

		InnermostComponent = 'span';
		outer.resetHistory();
		inner.resetHistory();
		render(<div />, scratch);

		expect(outer, 'unrender').to.have.been.calledOnce.and.calledWith(null);
		expect(inner, 'unrender').to.have.been.calledOnce.and.calledWith(null);
	});

	it('should pass high-order children to ref functions', () => {
		let outer = spy('outer'),
			inner = spy('inner'),
			innermost = spy('innermost'),
			InnermostComponent = 'span',
			outerInst,
			innerInst;
		class Outer extends Component {
			constructor() {
				super();
				outerInst = this;
			}
			render() {
				return <Inner ref={inner} />;
			}
		}
		class Inner extends Component {
			constructor() {
				super();
				innerInst = this;
			}
			render() {
				return <InnermostComponent ref={innermost} />;
			}
		}

		render(<Outer ref={outer} />, scratch);

		expect(outer, 'outer initial').to.have.been.calledOnce.and.calledWith(
			outerInst
		);
		expect(inner, 'inner initial').to.have.been.calledOnce.and.calledWith(
			innerInst
		);
		expect(
			innermost,
			'innerMost initial'
		).to.have.been.calledOnce.and.calledWith(innerInst.base);

		outer.resetHistory();
		inner.resetHistory();
		innermost.resetHistory();
		render(<Outer ref={outer} />, scratch);

		expect(outer, 'outer update').not.to.have.been.called;
		expect(inner, 'inner update').not.to.have.been.called;
		expect(innermost, 'innerMost update').not.to.have.been.called;

		innermost.resetHistory();
		InnermostComponent = 'x-span';
		render(<Outer ref={outer} />, scratch);

		expect(innermost, 'innerMost swap');
		expect(innermost.firstCall, 'innerMost swap').to.have.been.calledWith(null);
		expect(innermost.secondCall, 'innerMost swap').to.have.been.calledWith(
			innerInst.base
		);
		InnermostComponent = 'span';

		outer.resetHistory();
		inner.resetHistory();
		innermost.resetHistory();
		render(<div />, scratch);

		expect(outer, 'outer unmount').to.have.been.calledOnce.and.calledWith(null);
		expect(inner, 'inner unmount').to.have.been.calledOnce.and.calledWith(null);
		expect(
			innermost,
			'innerMost unmount'
		).to.have.been.calledOnce.and.calledWith(null);
	});

	// Test for #1143
	it('should not pass ref into component as a prop', () => {
		let foo = spy('foo'),
			bar = spy('bar');

		class Foo extends Component {
			render() {
				return <div />;
			}
		}
		const Bar = spy('Bar', () => <div />);

		sinon.spy(Foo.prototype, 'render');

		render(
			<div>
				<Foo ref={foo} a="a" />
				<Bar ref={bar} b="b" />
			</div>,
			scratch
		);

		expect(Foo.prototype.render).to.have.been.calledWithMatch(
			{ ref: sinon.match.falsy, a: 'a' },
			{},
			{}
		);
		expect(Bar).to.have.been.calledWithMatch(
			{ b: 'b', ref: sinon.match.falsy },
			{}
		);
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

	it('should add refs to components representing DOM nodes with no attributes if they have been pre-rendered', () => {
		// Simulate pre-render
		let parent = document.createElement('div');
		let child = document.createElement('div');
		parent.appendChild(child);
		scratch.appendChild(parent); // scratch contains: <div><div></div></div>

		let ref = spy('ref');

		class Wrapper extends Component {
			render() {
				return <div />;
			}
		}

		render(
			<div>
				<Wrapper ref={c => ref(c.base)} />
			</div>,
			scratch
		);
		expect(ref).to.have.been.calledOnce.and.calledWith(
			scratch.firstChild.firstChild
		);
	});

	// Test for #1177
	it('should call ref after children are rendered', done => {
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
});
