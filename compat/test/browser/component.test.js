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

		it('should call UNSAFE_* methods through Suspense with wrapper component #2525', () => {
			class Page extends React.Component {
				UNSAFE_componentWillMount() {}
				render() {
					return <h1>Example</h1>;
				}
			}

			const Wrapper = () => <Page />;

			sinon.spy(Page.prototype, 'UNSAFE_componentWillMount');

			React.render(
				<React.Suspense fallback={<div>fallback</div>}>
					<Wrapper />
				</React.Suspense>,
				scratch
			);

			expect(scratch.innerHTML).to.equal('<h1>Example</h1>');
			expect(Page.prototype.UNSAFE_componentWillMount).to.have.been.called;
		});
	});
});
