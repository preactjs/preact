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

	describe('#defaultProps', () => {
		it('should apply default props on initial render', () => {
			class WithDefaultProps extends Component {
				constructor(props, context) {
					super(props, context);
					expect(props).to.be.deep.equal({
						fieldC: 1, fieldD: 2
					});
				}
				render() {
					return <div />;
				}
			}
			WithDefaultProps.defaultProps = { fieldC: 1, fieldD: 1 };
			render(<WithDefaultProps fieldD={2} />, scratch);
		});
		it('should apply default props on rerender', () => {
			let doRender;
			class Outer extends Component {
				componentDidMount() {
					doRender = () => this.setState({ i: 2 });
				}
				render(props, { i }) {
					return <WithDefaultProps fieldD={i} />;
				}
			}
			class WithDefaultProps extends Component {
				constructor(props, context) {
					super(props, context);
					expect(props).to.be.deep.equal({
						fieldC: 1, fieldD: 1
					});
				}
				componentWillReceiveProps(nextProps) {
					expect(nextProps).to.be.deep.equal({
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
	});
});
