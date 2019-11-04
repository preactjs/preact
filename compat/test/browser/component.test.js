import { setupRerender } from 'preact/test-utils';
import { setupScratch, teardown } from '../../../test/_util/helpers';
import React, { createElement } from 'preact/compat';

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

	it('should have "isReactComponent" property', () => {
		let Comp = new React.Component();
		expect(Comp.isReactComponent).to.deep.equal({});

		let Pure = new React.PureComponent();
		expect(Pure.isReactComponent).to.deep.equal({});
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
			<Demo a="b" c="d">
				inner
			</Demo>,
			scratch
		);

		expect(props).to.exist.and.deep.equal({
			a: 'b',
			c: 'd',
			children: 'inner'
		});

		expect(scratch.innerHTML).to.equal('<div id="demo">inner</div>');
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

		let a = React.render(<Parent />, scratch);
		a.forceUpdate();
		rerender();

		expect(props).to.exist.and.deep.equal({
			children: 'second'
		});
	});

	describe('PureComponent', () => {
		it('should be a class', () => {
			expect(React)
				.to.have.property('PureComponent')
				.that.is.a('function');
		});

		it('should pass props in constructor', () => {
			let spy = sinon.spy();
			class Foo extends React.PureComponent {
				constructor(props) {
					super(props);
					spy(this.props, props);
				}
			}

			React.render(<Foo foo="bar" />, scratch);

			let expected = { foo: 'bar' };
			expect(spy).to.be.calledWithMatch(expected, expected);
		});

		it('should ignore the __source variable', () => {
			const pureSpy = sinon.spy();
			const appSpy = sinon.spy();
			let set;
			class Pure extends React.PureComponent {
				render() {
					pureSpy();
					return <div>Static</div>;
				}
			}

			const App = () => {
				const [, setState] = React.useState(0);
				appSpy();
				set = setState;
				return <Pure __source={{}} />;
			};

			React.render(<App />, scratch);
			expect(appSpy).to.be.calledOnce;
			expect(pureSpy).to.be.calledOnce;

			set(1);
			rerender();
			expect(appSpy).to.be.calledTwice;
			expect(pureSpy).to.be.calledOnce;
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

			inst.setState({});
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

		it('should update when props are removed', () => {
			let spy = sinon.spy();
			class App extends React.PureComponent {
				render() {
					spy();
					return <div>foo</div>;
				}
			}

			React.render(<App a="foo" />, scratch);
			React.render(<App />, scratch);
			expect(spy).to.be.calledTwice;
		});
	});

	describe('UNSAFE_* lifecycle methods', () => {
		it('should support UNSAFE_componentWillMount', () => {
			let spy = sinon.spy();

			class Foo extends React.Component {
				// eslint-disable-next-line camelcase
				UNSAFE_componentWillMount() {
					spy();
				}

				render() {
					return <h1>foo</h1>;
				}
			}

			React.render(<Foo />, scratch);

			expect(spy).to.be.calledOnce;
		});

		it('should support UNSAFE_componentWillMount #2', () => {
			let spy = sinon.spy();

			class Foo extends React.Component {
				render() {
					return <h1>foo</h1>;
				}
			}

			Object.defineProperty(Foo.prototype, 'UNSAFE_componentWillMount', {
				value: spy
			});

			React.render(<Foo />, scratch);
			expect(spy).to.be.calledOnce;
		});

		it('should support UNSAFE_componentWillReceiveProps', () => {
			let spy = sinon.spy();

			class Foo extends React.Component {
				// eslint-disable-next-line camelcase
				UNSAFE_componentWillReceiveProps() {
					spy();
				}

				render() {
					return <h1>foo</h1>;
				}
			}

			React.render(<Foo />, scratch);
			// Trigger an update
			React.render(<Foo />, scratch);
			expect(spy).to.be.calledOnce;
		});

		it('should support UNSAFE_componentWillReceiveProps #2', () => {
			let spy = sinon.spy();

			class Foo extends React.Component {
				render() {
					return <h1>foo</h1>;
				}
			}

			Object.defineProperty(Foo.prototype, 'UNSAFE_componentWillReceiveProps', {
				value: spy
			});

			React.render(<Foo />, scratch);
			// Trigger an update
			React.render(<Foo />, scratch);
			expect(spy).to.be.calledOnce;
		});

		it('should support UNSAFE_componentWillUpdate', () => {
			let spy = sinon.spy();

			class Foo extends React.Component {
				// eslint-disable-next-line camelcase
				UNSAFE_componentWillUpdate() {
					spy();
				}

				render() {
					return <h1>foo</h1>;
				}
			}

			React.render(<Foo />, scratch);
			// Trigger an update
			React.render(<Foo />, scratch);
			expect(spy).to.be.calledOnce;
		});

		it('should support UNSAFE_componentWillUpdate #2', () => {
			let spy = sinon.spy();

			class Foo extends React.Component {
				render() {
					return <h1>foo</h1>;
				}
			}

			Object.defineProperty(Foo.prototype, 'UNSAFE_componentWillUpdate', {
				value: spy
			});

			React.render(<Foo />, scratch);
			// Trigger an update
			React.render(<Foo />, scratch);
			expect(spy).to.be.calledOnce;
		});

		it('should alias UNSAFE_* method to non-prefixed variant', () => {
			let inst;
			class Foo extends React.Component {
				// eslint-disable-next-line camelcase
				UNSAFE_componentWillMount() {}
				// eslint-disable-next-line camelcase
				UNSAFE_componentWillReceiveProps() {}
				// eslint-disable-next-line camelcase
				UNSAFE_componentWillUpdate() {}
				render() {
					inst = this;
					return <div>foo</div>;
				}
			}

			React.render(<Foo />, scratch);

			expect(inst.UNSAFE_componentWillMount).to.equal(inst.componentWillMount);
			expect(inst.UNSAFE_componentWillReceiveProps).to.equal(
				inst.UNSAFE_componentWillReceiveProps
			);
			expect(inst.UNSAFE_componentWillUpdate).to.equal(
				inst.UNSAFE_componentWillUpdate
			);
		});
	});
});
