import { h, render, rerender, Component } from '../../src/preact';
/** @jsx h */

describe('Component spec', () => {
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

	describe('#getDefaultProps', () => {
		it('should apply default props on initial render', () => {
			class WithDefaultProps extends Component {
				constructor(props, context) {
					super(props, context);
					expect(props).to.be.deep.equal({
						fieldA: 1, fieldB: 2,
						fieldC: 1, fieldD: 2
					});
				}
				getDefaultProps() {
					return { fieldA: 1, fieldB: 1 };
				}
				render() {
					return <div />;
				}
			}
			WithDefaultProps.defaultProps = { fieldC: 1, fieldD: 1 };
			render(<WithDefaultProps fieldB={2} fieldD={2} />, scratch);
		});
		it('should apply default props on rerender', () => {
			let doRender;
			class Outer extends Component {
				componentDidMount() {
					doRender = () => this.setState({ i: 2 });
				}
				render(props, { i }) {
					return <WithDefaultProps fieldB={i} fieldD={i} />;
				}
			}
			class WithDefaultProps extends Component {
				constructor(props, context) {
					super(props, context);
					expect(props).to.be.deep.equal({
						fieldA: 1, fieldB: 1,
						fieldC: 1, fieldD: 1
					});
				}
				getDefaultProps() {
					return { fieldA: 1, fieldB: 1 };
				}
				componentWillReceiveProps(nextProps) {
					expect(nextProps).to.be.deep.equal({
						fieldA: 1, fieldB: 2,
						fieldC: 1, fieldD: 2
					});
				}
				render() {
					return <div />;
				}
			}
			WithDefaultProps.defaultProps = { fieldC: 1, fieldD: 1 };
			sinon.spy(WithDefaultProps.prototype, 'componentWillReceiveProps');
			sinon.spy(Outer.prototype, 'componentDidMount');

			render(<Outer />, scratch);
			doRender();
			rerender();
			expect(WithDefaultProps.prototype.componentWillReceiveProps).to.be.called;
		});
		it('should cache default props', () => {
			class WithDefaultProps extends Component {
				constructor(props, context) {
					super(props, context);
					expect(props).to.be.deep.equal({
						fieldA: 1, fieldB: 2,
						fieldC: 1, fieldD: 2,
						fieldX: 10
					});
				}
				getDefaultProps() {
					return { fieldA: 1, fieldB: 1 };
				}
				render() {
					return <div />;
				}
			}
			WithDefaultProps.defaultProps = { fieldC: 1, fieldD: 1 };
			sinon.spy(WithDefaultProps.prototype, 'getDefaultProps');
			render((
				<div>
					<WithDefaultProps fieldB={2} fieldD={2} fieldX={10} />
					<WithDefaultProps fieldB={2} fieldD={2} fieldX={10} />
					<WithDefaultProps fieldB={2} fieldD={2} fieldX={10} />
				</div>
			), scratch);
			expect(WithDefaultProps.prototype.getDefaultProps).to.be.calledOnce;
		});
	});
});
