import { setupRerender } from 'preact/test-utils';
import { createElement, render, Component } from 'preact';
import { setupScratch, teardown } from '../../_util/helpers';
import { vi } from 'vitest';

describe('Lifecycle methods', () => {
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

	describe('#componentWillReceiveProps', () => {
		it('should update state when called setState in componentWillReceiveProps', () => {
			let componentState;

			class Foo extends Component {
				constructor(props) {
					super(props);
					this.state = {
						dummy: 0
					};
				}
				componentDidMount() {
					// eslint-disable-next-line react/no-did-mount-set-state
					this.setState({ dummy: 1 });
				}
				render() {
					return <Bar dummy={this.state.dummy} />;
				}
			}
			class Bar extends Component {
				constructor(props) {
					super(props);
					this.state = {
						value: 0
					};
				}
				componentWillReceiveProps() {
					this.setState({ value: 1 });
				}
				render() {
					componentState = this.state;
					return <div />;
				}
			}

			render(<Foo />, scratch);
			rerender();

			expect(componentState).to.deep.equal({ value: 1 });

			const cWRP = Foo.prototype.componentWillReceiveProps;
			delete Foo.prototype.componentWillReceiveProps;

			Foo.prototype.shouldComponentUpdate = cWRP;

			render(null, scratch);
			render(<Foo />, scratch);
			rerender();

			expect(componentState, 'via shouldComponentUpdate').to.deep.equal({
				value: 1
			});

			delete Foo.prototype.shouldComponentUpdate;
			Foo.prototype.componentWillUpdate = cWRP;

			render(null, scratch);
			render(<Foo />, scratch);
			rerender();

			expect(componentState, 'via componentWillUpdate').to.deep.equal({
				value: 1
			});
		});

		it('should NOT be called on initial render', () => {
			class ReceivePropsComponent extends Component {
				componentWillReceiveProps() {}
				render() {
					return <div />;
				}
			}
			vi.spyOn(ReceivePropsComponent.prototype, 'componentWillReceiveProps');
			render(<ReceivePropsComponent />, scratch);
			expect(
				ReceivePropsComponent.prototype.componentWillReceiveProps
			).not.toHaveBeenCalled();
		});

		// See last paragraph of cWRP section https://reactjs.org/docs/react-component.html#unsafe_componentwillreceiveprops
		it('should not be called on setState or forceUpdate', () => {
			let spy = vi.fn();
			let spyInner = vi.fn();
			let c;

			class Inner extends Component {
				componentWillReceiveProps() {
					spyInner();
				}

				render() {
					return <div>foo</div>;
				}
			}

			class Outer extends Component {
				constructor() {
					super();
					c = this;
				}

				componentWillReceiveProps() {
					spy();
				}

				render() {
					return <Inner />;
				}
			}

			render(<Outer />, scratch);
			expect(spy).not.toHaveBeenCalled();

			c.setState({});
			rerender();
			expect(spy).not.toHaveBeenCalled();
			expect(spyInner).toHaveBeenCalledOnce();
			spy.mockClear();
			spyInner.mockClear();

			c.forceUpdate();
			rerender();
			expect(spy).not.toHaveBeenCalled();
			expect(spyInner).toHaveBeenCalledOnce();
		});

		it('should be called when rerender with new props from parent', () => {
			let doRender;
			class Outer extends Component {
				constructor(p, c) {
					super(p, c);
					this.state = { i: 0 };
				}
				componentDidMount() {
					doRender = () => this.setState({ i: this.state.i + 1 });
				}
				render(props, { i }) {
					return <Inner i={i} {...props} />;
				}
			}
			class Inner extends Component {
				componentWillMount() {
					expect(this.props.i).to.be.equal(0);
				}
				componentWillReceiveProps(nextProps) {
					expect(nextProps.i).to.be.equal(1);
				}
				render() {
					return <div />;
				}
			}
			vi.spyOn(Inner.prototype, 'componentWillReceiveProps');
			vi.spyOn(Outer.prototype, 'componentDidMount');

			// Initial render
			render(<Outer />, scratch);
			expect(Inner.prototype.componentWillReceiveProps).not.toHaveBeenCalled();

			// Rerender inner with new props
			doRender();
			rerender();
			expect(Inner.prototype.componentWillReceiveProps).toHaveBeenCalled();
		});

		it('should be called when rerender with new props from parent even with setState/forceUpdate in child', () => {
			let setStateAndUpdateProps;
			let forceUpdateAndUpdateProps;
			let cWRPSpy = vi.fn();

			class Outer extends Component {
				constructor(p, c) {
					super(p, c);
					this.state = { i: 0 };
					this.update = this.update.bind(this);
				}
				update() {
					this.setState({ i: this.state.i + 1 });
				}
				render(props, { i }) {
					return <Inner i={i} update={this.update} />;
				}
			}
			class Inner extends Component {
				componentDidMount() {
					expect(this.props.i).to.be.equal(0);

					setStateAndUpdateProps = () => {
						this.setState({});
						this.props.update();
					};
					forceUpdateAndUpdateProps = () => {
						this.forceUpdate();
						this.props.update();
					};
				}
				componentWillReceiveProps(nextProps) {
					cWRPSpy(nextProps.i);
				}
				render() {
					return <div />;
				}
			}
			// Initial render
			render(<Outer />, scratch);
			expect(cWRPSpy).not.toHaveBeenCalled();

			// setState in inner component and update with new props
			setStateAndUpdateProps();
			rerender();
			expect(cWRPSpy).toHaveBeenCalledWith(1);

			// forceUpdate in inner component and update with new props
			forceUpdateAndUpdateProps();
			rerender();
			expect(cWRPSpy).toHaveBeenCalledWith(2);
		});

		it('should be called in right execution order', () => {
			let doRender;
			class Outer extends Component {
				constructor(p, c) {
					super(p, c);
					this.state = { i: 0 };
				}
				componentDidMount() {
					doRender = () => this.setState({ i: this.state.i + 1 });
				}
				render(props, { i }) {
					return <Inner i={i} {...props} />;
				}
			}
			class Inner extends Component {
				componentDidUpdate() {
					expect(Inner.prototype.componentWillReceiveProps).toHaveBeenCalled();
					expect(Inner.prototype.componentWillUpdate).toHaveBeenCalled();
				}
				componentWillReceiveProps() {
					expect(Inner.prototype.componentWillUpdate).not.toHaveBeenCalled();
					expect(Inner.prototype.componentDidUpdate).not.toHaveBeenCalled();
				}
				componentWillUpdate() {
					expect(Inner.prototype.componentWillReceiveProps).toHaveBeenCalled();
					expect(Inner.prototype.componentDidUpdate).not.toHaveBeenCalled();
				}
				shouldComponentUpdate() {
					expect(Inner.prototype.componentWillReceiveProps).toHaveBeenCalled();
					expect(Inner.prototype.componentWillUpdate).not.toHaveBeenCalled();
					return true;
				}
				render() {
					return <div />;
				}
			}
			vi.spyOn(Inner.prototype, 'componentWillReceiveProps');
			vi.spyOn(Inner.prototype, 'componentDidUpdate');
			vi.spyOn(Inner.prototype, 'componentWillUpdate');
			vi.spyOn(Inner.prototype, 'shouldComponentUpdate');
			vi.spyOn(Outer.prototype, 'componentDidMount');

			render(<Outer />, scratch);
			doRender();
			rerender();

			expect(Inner.prototype.componentWillReceiveProps).toHaveBeenCalledBefore(
				Inner.prototype.componentWillUpdate
			);
			expect(Inner.prototype.componentWillReceiveProps).toHaveBeenCalledBefore(
				Inner.prototype.shouldComponentUpdate
			);
			expect(Inner.prototype.componentWillUpdate).toHaveBeenCalledBefore(
				Inner.prototype.componentDidUpdate
			);
		});
	});
});
