import { setupScratch, teardown, setupRerender } from '../../../test/_util/helpers';
import React from '../../src';

describe('components', () => {

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

	it('should be sane', () => {
		let props;

		class Demo extends React.Component {
			render() {
				props = this.props;
				return <div id="demo">{this.props.children}</div>;
			}
		}

		React.render(
			<Demo a="b" c="d">inner</Demo>,
			scratch
		);

		expect(props).to.exist.and.deep.equal({
			a: 'b',
			c: 'd',
			children: 'inner'
		});

		expect(scratch.innerHTML).to.equal('<div id="demo">inner</div>');
	});

	it('should alias props.children', () => {
		class Foo extends React.Component {
			render() {
				return <div>{this.props.children}</div>;
			}
		}

		let children = ['a', <span>b</span>, <b>c</b>],
			foo;

		React.render((
			<Foo ref={ c => foo=c }>
				{ children }
			</Foo>
		), scratch);
		expect(foo.props).to.exist.and.have.property('children').eql(children);
	});

	it('should single out children before componentWillReceiveProps', () => {
		let props;

		class Child extends React.Component {
			componentWillReceiveProps(newProps) {
				props = newProps;
			}
		}

		class Parent extends React.Component {
			render() {
				return <Child>second</Child>;
			}
		}

		let a = React.render(<Parent/>, scratch);
		a.forceUpdate();

		expect(props).to.exist.and.deep.equal({
			children: 'second'
		});
	});

	it('should support array[object] children', () => {
		let children;

		class Foo extends React.Component {
			render() {
				children = this.props.children;
				return <div />;
			}
		}

		const data = [{ a: '' }];
		React.render(<Foo>{ data }</Foo>, scratch);

		expect(children).to.exist.and.deep.equal(data);
	});

	describe('PureComponent', () => {
		it('should be a class', () => {
			expect(React).to.have.property('PureComponent').that.is.a('function');
		});

		it('should only re-render when props or state change', () => {
			class C extends React.PureComponent {
				render() {
					return <div />;
				}
			}
			let spy = sinon.spy(C.prototype, 'render');

			let inst = React.render(<C />, scratch);
			expect(spy).to.have.been.calledOnce;
			spy.resetHistory();

			inst = React.render(<C />, scratch);
			expect(spy).not.to.have.been.called;

			let b = { foo: 'bar' };
			inst = React.render(<C a="a" b={b} />, scratch);
			expect(spy).to.have.been.calledOnce;
			spy.resetHistory();

			inst = React.render(<C a="a" b={b} />, scratch);
			expect(spy).not.to.have.been.called;

			inst.setState({ });
			rerender();
			expect(spy).not.to.have.been.called;

			inst.setState({ a: 'a', b });
			rerender();
			expect(spy).to.have.been.calledOnce;
			spy.resetHistory();

			inst.setState({ a: 'a', b });
			rerender();
			expect(spy).not.to.have.been.called;
		});
	});
});
