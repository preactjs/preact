import { setupRerender, teardown } from 'preact/test-utils';
import { setupScratch } from '../../../test/_util/helpers';
import { PureComponent } from '../../src';
import { createElement as h, render } from 'preact';

/** @jsx h */

describe('PureComponent', () => {

	/** @type {HTMLDivElement} */
	let scratch;

	/** @type {() => void} */
	let rerender;

	beforeEach(() => {
		scratch = setupScratch();
		rerender = setupRerender();
	});

	afterEach(() => {
		teardown(scratch);
	});

	it('should pass props in constructor', () => {
		let spy = sinon.spy();
		class Foo extends PureComponent {
			constructor(props) {
				super(props);
				spy(this.props, props);
			}
		}

		render(<Foo foo="bar" />, scratch);

		let expected = { foo: 'bar' };
		expect(spy).to.be.calledWithMatch(expected, expected);
	});

	it('should only re-render when props or state change', () => {
		let setState;
		class C extends PureComponent {

			constructor(props) {
				super(props);
				setState = this.test = this.test.bind(this);
			}

			test(x) {
				this.setState(x);
			}

			render() {
				return <div />;
			}
		}
		let spy = sinon.spy(C.prototype, 'render');

		render(<C />, scratch);
		expect(spy).to.have.been.calledOnce;
		spy.resetHistory();

		render(<C />, scratch);
		expect(spy).not.to.have.been.called;

		let b = { foo: 'bar' };
		render(<C a="a" b={b} />, scratch);
		expect(spy).to.have.been.calledOnce;
		spy.resetHistory();

		render(<C a="a" b={b} />, scratch);
		expect(spy).not.to.have.been.called;

		setState({ });
		rerender();
		expect(spy).not.to.have.been.called;

		setState({ a: 'a', b });
		rerender();
		expect(spy).to.have.been.calledOnce;
		spy.resetHistory();

		setState({ a: 'a', b });
		rerender();
		expect(spy).not.to.have.been.called;
	});

	it('should update when props are removed', () => {
		let spy = sinon.spy();
		class App extends PureComponent {
			render() {
				spy();
				return <div>foo</div>;
			}
		}

		render(<App a="foo" />, scratch);
		render(<App />, scratch);
		expect(spy).to.be.calledTwice;
	});
});
