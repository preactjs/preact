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

	it('should pass ref into component as a prop', () => {
		let foo = spy('foo'),
			bar = spy('bar');

		class Foo extends Component {
			render() {
				return <div />;
			}
		}
		const Bar = spy('Bar', function Bar() {
			return <div />;
		});

		sinon.spy(Foo.prototype, 'render');

		render(
			<div>
				<Foo ref={foo} a="a" />
				<Bar ref={bar} b="b" />
			</div>,
			scratch
		);

		expect(Foo.prototype.render).to.have.been.calledWithMatch(
			{ ref: sinon.match.truthy, a: 'a' },
			{},
			{}
		);
		expect(Bar).to.have.been.calledWithMatch(
			{ b: 'b', ref: sinon.match.truthy },
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
