import { setupRerender } from 'preact/test-utils';
import { setupScratch, teardown } from '../../../test/_util/helpers';
import React, { createElement, Component, createRef } from 'preact/compat';
import { vi } from 'vitest';

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
			render() {
				return this.props.children;
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

	describe('UNSAFE_* lifecycle methods', () => {
		it('should support UNSAFE_componentWillMount', () => {
			let spy = vi.fn();

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

			expect(spy).toHaveBeenCalledOnce();
		});

		it('should support UNSAFE_componentWillMount #2', () => {
			let spy = vi.fn();

			class Foo extends React.Component {
				render() {
					return <h1>foo</h1>;
				}
			}

			Object.defineProperty(Foo.prototype, 'UNSAFE_componentWillMount', {
				value: spy
			});

			React.render(<Foo />, scratch);
			expect(spy).toHaveBeenCalledOnce();
		});

		it('should support UNSAFE_componentWillReceiveProps', () => {
			let spy = vi.fn();

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
			expect(spy).toHaveBeenCalledOnce();
		});

		it('should support UNSAFE_componentWillReceiveProps #2', () => {
			let spy = vi.fn();

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
			expect(spy).toHaveBeenCalledOnce();
		});

		it('should support UNSAFE_componentWillUpdate', () => {
			let spy = vi.fn();

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
			expect(spy).toHaveBeenCalledOnce();
		});

		it('should support UNSAFE_componentWillUpdate #2', () => {
			let spy = vi.fn();

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
			expect(spy).toHaveBeenCalledOnce();
		});

		it('should not forward refs on class components', () => {
			const ref = createRef();
			class Foo extends React.Component {
				render() {
					return <div>foo</div>;
				}
			}
			React.render(<Foo ref={ref} />, scratch);
			expect(ref.current).not.to.be.undefined;
			expect(ref.current instanceof Foo).to.equal(true);
			expect(scratch.innerHTML).to.equal('<div>foo</div>');
		});

		it('should forward refs on functional components', () => {
			const ref = createRef();
			const Foo = props => <div ref={props.ref}>foo</div>;
			React.render(<Foo ref={ref} />, scratch);
			expect(ref.current).not.to.be.undefined;
			expect(ref.current.nodeName).to.equal('DIV');
			expect(scratch.innerHTML).to.equal('<div>foo</div>');
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

		it('should call UNSAFE_* methods through Suspense with wrapper component #2525', () => {
			class Page extends React.Component {
				UNSAFE_componentWillMount() {}
				render() {
					return <h1>Example</h1>;
				}
			}

			const Wrapper = () => <Page />;

			vi.spyOn(Page.prototype, 'UNSAFE_componentWillMount');

			React.render(
				<React.Suspense fallback={<div>fallback</div>}>
					<Wrapper />
				</React.Suspense>,
				scratch
			);

			expect(scratch.innerHTML).to.equal('<h1>Example</h1>');
			expect(Page.prototype.UNSAFE_componentWillMount).toHaveBeenCalled();
		});
	});

	describe('defaultProps', () => {
		it('should apply default props on initial render', () => {
			class WithDefaultProps extends Component {
				constructor(props, context) {
					super(props, context);
					expect(props).to.be.deep.equal({
						fieldA: 1,
						fieldB: 2,
						fieldC: 1,
						fieldD: 2
					});
				}
				render() {
					return <div />;
				}
			}
			WithDefaultProps.defaultProps = { fieldC: 1, fieldD: 1 };
			React.render(
				<WithDefaultProps fieldA={1} fieldB={2} fieldD={2} />,
				scratch
			);
		});

		it('should apply default props on rerender', () => {
			let doRender;
			class Outer extends Component {
				constructor() {
					super();
					this.state = { i: 1 };
				}
				componentDidMount() {
					doRender = () => this.setState({ i: 2 });
				}
				render(props, { i }) {
					return <WithDefaultProps fieldA={1} fieldB={i} fieldD={i} />;
				}
			}
			class WithDefaultProps extends Component {
				constructor(props, context) {
					super(props, context);
					this.ctor(props, context);
				}
				ctor() {}
				componentWillReceiveProps() {}
				render() {
					return <div />;
				}
			}
			WithDefaultProps.defaultProps = { fieldC: 1, fieldD: 1 };

			let proto = WithDefaultProps.prototype;
			vi.spyOn(proto, 'ctor');
			vi.spyOn(proto, 'componentWillReceiveProps');
			vi.spyOn(proto, 'render');

			React.render(<Outer />, scratch);
			doRender();

			const PROPS1 = {
				fieldA: 1,
				fieldB: 1,
				fieldC: 1,
				fieldD: 1
			};

			const PROPS2 = {
				fieldA: 1,
				fieldB: 2,
				fieldC: 1,
				fieldD: 2
			};

			expect(proto.ctor).toHaveBeenCalledWith(PROPS1, {});
			expect(proto.render).toHaveBeenCalledWith(PROPS1, {}, {});

			rerender();

			// expect(proto.ctor).to.have.been.calledWith(PROPS2);
			expect(proto.componentWillReceiveProps).toHaveBeenCalledWith(PROPS2, {});
			expect(proto.render).toHaveBeenCalledWith(PROPS2, {}, {});
		});
	});
});
