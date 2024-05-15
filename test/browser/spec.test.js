import { setupRerender } from 'preact/test-utils';
import { createElement, render, Component } from 'preact';
import { setupScratch, teardown } from '../_util/helpers';

/** @jsx createElement */

describe('Component spec', () => {
	let scratch, rerender;

	beforeEach(() => {
		scratch = setupScratch();
		rerender = setupRerender();
	});

	afterEach(() => {
		teardown(scratch);
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
			render(<WithDefaultProps fieldA={1} fieldB={2} fieldD={2} />, scratch);
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
			sinon.spy(proto, 'ctor');
			sinon.spy(proto, 'componentWillReceiveProps');
			sinon.spy(proto, 'render');

			render(<Outer />, scratch);
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

			expect(proto.ctor).to.have.been.calledWithMatch(PROPS1);
			expect(proto.render).to.have.been.calledWithMatch(PROPS1);

			rerender();

			// expect(proto.ctor).to.have.been.calledWith(PROPS2);
			expect(proto.componentWillReceiveProps).to.have.been.calledWithMatch(
				PROPS2
			);
			expect(proto.render).to.have.been.calledWithMatch(PROPS2);
		});
	});

	describe('forceUpdate', () => {
		it('should force a rerender', () => {
			let forceUpdate;
			class ForceUpdateComponent extends Component {
				componentWillUpdate() {}
				componentDidMount() {
					forceUpdate = () => this.forceUpdate();
				}
				render() {
					return <div />;
				}
			}
			sinon.spy(ForceUpdateComponent.prototype, 'componentWillUpdate');
			sinon.spy(ForceUpdateComponent.prototype, 'forceUpdate');
			render(<ForceUpdateComponent />, scratch);
			expect(ForceUpdateComponent.prototype.componentWillUpdate).not.to.have
				.been.called;

			forceUpdate();
			rerender();

			expect(ForceUpdateComponent.prototype.componentWillUpdate).to.have.been
				.called;
			expect(ForceUpdateComponent.prototype.forceUpdate).to.have.been.called;
		});

		it('should add callback to renderCallbacks', () => {
			let forceUpdate;
			let callback = sinon.spy();
			class ForceUpdateComponent extends Component {
				componentDidMount() {
					forceUpdate = () => this.forceUpdate(callback);
				}
				render() {
					return <div />;
				}
			}
			sinon.spy(ForceUpdateComponent.prototype, 'forceUpdate');
			render(<ForceUpdateComponent />, scratch);

			forceUpdate();
			rerender();

			expect(ForceUpdateComponent.prototype.forceUpdate).to.have.been.called;
			expect(
				ForceUpdateComponent.prototype.forceUpdate
			).to.have.been.calledWith(callback);
			expect(callback).to.have.been.called;
		});
	});
});
