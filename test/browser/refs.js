import { h, render, Component } from '../../src/preact';
/** @jsx h */

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
		let spy = sinon.spy();
		render(<div ref={spy} />, scratch);
		expect(spy).to.have.been.calledOnce.and.calledWith(scratch.firstChild);
	});

	it('should invoke refs in Component.render()', () => {
		let outer = sinon.spy(),
			inner = sinon.spy();
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
		let spy = sinon.spy(),
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
		render(<Foo ref={spy} />, scratch);

		expect(spy).to.have.been.calledOnce.and.calledWith(instance);
	});

	it('should pass high-order children to ref functions', () => {
		let outer = sinon.spy(),
			inner = sinon.spy(),
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
				return <span />;
			}
		}
		render(<Outer ref={outer} />, scratch);

		expect(outer).to.have.been.calledOnce.and.calledWith(outerInst);
		expect(inner).to.have.been.calledOnce.and.calledWith(innerInst);
	});
});
