import { h, render, Component } from '../../src/preact';
/** @jsx h */

// gives call count and argument errors names (otherwise sinon just uses "spy"):
let spy = (name, ...args) => {
	let spy = sinon.spy(...args);
	spy.displayName = `spy('${name}')`;
	return spy;
};

describe('refs', () => {
	let scratch;

	before( () => {
		scratch = document.createElement('div');
		(document.body || document.documentElement).appendChild(scratch);
	});

	beforeEach( () => {
		scratch.innerHTML = '';
	});

	after( () => {
		scratch.parentNode.removeChild(scratch);
		scratch = null;
	});

	it('should invoke refs in render()', () => {
		let ref = spy('ref');
		render(<div ref={ref} />, scratch);
		expect(ref).to.have.been.calledOnce.and.calledWith(scratch.firstChild);
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

	it('should pass rendered DOM from functional components to ref functions', () => {
		let ref = spy('ref');

		const Foo = () => <div />;

		let root = render(<Foo ref={ref} />, scratch);
		expect(ref).to.have.been.calledOnce.and.calledWith(scratch.firstChild);

		ref.reset();
		render(<Foo ref={ref} />, scratch, root);
		expect(ref).to.have.been.calledOnce.and.calledWith(scratch.firstChild);

		ref.reset();
		render(<span />, scratch, root);
		expect(ref).to.have.been.calledOnce.and.calledWith(null);
	});

	it('should pass children to ref functions', () => {
		let outer = spy('outer'),
			inner = spy('inner'),
			rerender, inst;
		class Outer extends Component {
			constructor() {
				super();
				rerender = () => this.forceUpdate();
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
				return <span ref={inner} />;
			}
		}

		let root = render(<Outer />, scratch);

		expect(outer).to.have.been.calledOnce.and.calledWith(inst);
		expect(inner).to.have.been.calledOnce.and.calledWith(inst.base);

		outer.reset();
		inner.reset();

		rerender();

		expect(outer).to.have.been.calledOnce.and.calledWith(inst);
		expect(inner).to.have.been.calledOnce.and.calledWith(inst.base);

		outer.reset();
		inner.reset();

		render(<div />, scratch, root);

		expect(outer).to.have.been.calledOnce.and.calledWith(null);
		expect(inner).to.have.been.calledOnce.and.calledWith(null);
	});

	it('should pass high-order children to ref functions', () => {
		let outer = spy('outer'),
			inner = spy('inner'),
			innermost = spy('innermost'),
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
				return <span ref={innermost} />;
			}
		}

		let root = render(<Outer ref={outer} />, scratch);

		expect(outer).to.have.been.calledOnce.and.calledWith(outerInst);
		expect(inner).to.have.been.calledOnce.and.calledWith(innerInst);
		expect(innermost).to.have.been.calledOnce.and.calledWith(innerInst.base);

		outer.reset();
		inner.reset();
		innermost.reset();
		root = render(<Outer ref={outer} />, scratch, root);

		expect(outer).to.have.been.calledOnce.and.calledWith(outerInst);
		expect(inner).to.have.been.calledOnce.and.calledWith(innerInst);
		expect(innermost).to.have.been.calledOnce.and.calledWith(innerInst.base);

		outer.reset();
		inner.reset();
		innermost.reset();
		root = render(<div />, scratch, root);

		expect(outer).to.have.been.calledOnce.and.calledWith(null);
		expect(inner).to.have.been.calledOnce.and.calledWith(null);
		expect(innermost).to.have.been.calledOnce.and.calledWith(null);
	});

	it('should not pass ref into component as a prop', () => {
		let foo = spy('foo'),
			bar = spy('bar');

		class Foo extends Component {
			render(){ return <div />; }
		}
		const Bar = spy('Bar', () => <div />);

		sinon.spy(Foo.prototype, 'render');

		render((
			<div>
				<Foo ref={foo} a="a" />
				<Bar ref={bar} b="b" />
			</div>
		), scratch);

		expect(Foo.prototype.render).to.have.been.calledWithExactly({ a:'a' }, { }, { });
		expect(Bar).to.have.been.calledWithExactly({ b:'b', ref:bar }, { });
	});
});
