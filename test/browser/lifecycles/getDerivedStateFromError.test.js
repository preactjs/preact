import { setupRerender } from 'preact/test-utils';
import { createElement, render, Component } from 'preact';
import { setupScratch, teardown } from '../../_util/helpers';

/** @jsx createElement */

describe('Lifecycle methods', () => {
	/* eslint-disable react/display-name */

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

	describe('#getDerivedStateFromError', () => {
		/** @type {Error} */
		let expectedError;

		/** @type {typeof import('../../../').Component} */
		let ThrowErr;

		let thrower;

		class Receiver extends Component {
			static getDerivedStateFromError(error) {
				return { error };
			}
			render() {
				return this.state.error
					? String(this.state.error)
					: this.props.children;
			}
		}

		sinon.spy(Receiver, 'getDerivedStateFromError');
		sinon.spy(Receiver.prototype, 'render');

		function throwExpectedError() {
			throw (expectedError = new Error('Error!'));
		}

		beforeEach(() => {
			ThrowErr = class ThrowErr extends Component {
				constructor(props) {
					super(props);
					thrower = this;
				}

				static getDerivedStateFromError() {
					expect.fail("Throwing component should not catch it's own error.");
					return {};
				}
				render() {
					return <div>ThrowErr: getDerivedStateFromError</div>;
				}
			};
			sinon.spy(ThrowErr, 'getDerivedStateFromError');

			expectedError = undefined;

			Receiver.getDerivedStateFromError.resetHistory();
			Receiver.prototype.render.resetHistory();
		});

		afterEach(() => {
			expect(
				ThrowErr.getDerivedStateFromError,
				"Throwing component should not catch it's own error."
			).to.not.be.called;
			thrower = undefined;
		});

		it('should be called when child fails in constructor', () => {
			class ThrowErr extends Component {
				constructor(props, context) {
					super(props, context);
					throwExpectedError();
				}
				static getDerivedStateFromError() {
					expect.fail("Throwing component should not catch it's own error");
					return {};
				}
				render() {
					return <div />;
				}
			}

			render(
				<Receiver>
					<ThrowErr />
				</Receiver>,
				scratch
			);
			rerender();

			expect(Receiver.getDerivedStateFromError).to.have.been.calledWith(
				expectedError
			);
		});

		// https://github.com/preactjs/preact/issues/1570
		it('should handle double child throws', () => {
			const Child = ({ i }) => {
				throw new Error(`error! ${i}`);
			};

			const fn = () =>
				render(
					<Receiver>
						{[1, 2].map(i => (
							<Child key={i} i={i} />
						))}
					</Receiver>,
					scratch
				);
			expect(fn).to.not.throw();

			rerender();
			expect(scratch.innerHTML).to.equal('Error: error! 2');
		});

		it('should be called when child fails in componentWillMount', () => {
			ThrowErr.prototype.componentWillMount = throwExpectedError;

			render(
				<Receiver>
					<ThrowErr />
				</Receiver>,
				scratch
			);
			expect(Receiver.getDerivedStateFromError).to.have.been.calledWith(
				expectedError
			);
		});

		it('should be called when child fails in render', () => {
			ThrowErr.prototype.render = throwExpectedError;

			render(
				<Receiver>
					<ThrowErr />
				</Receiver>,
				scratch
			);
			expect(Receiver.getDerivedStateFromError).to.have.been.calledWith(
				expectedError
			);
		});

		it('should be called when child fails in componentDidMount', () => {
			ThrowErr.prototype.componentDidMount = throwExpectedError;

			render(
				<Receiver>
					<ThrowErr />
				</Receiver>,
				scratch
			);
			expect(Receiver.getDerivedStateFromError).to.have.been.calledWith(
				expectedError
			);
		});

		it('should be called when child fails in getDerivedStateFromProps', () => {
			ThrowErr.getDerivedStateFromProps = throwExpectedError;

			sinon.spy(ThrowErr.prototype, 'render');
			render(
				<Receiver>
					<ThrowErr />
				</Receiver>,
				scratch
			);

			expect(Receiver.getDerivedStateFromError).to.have.been.calledWith(
				expectedError
			);
			expect(ThrowErr.prototype.render).not.to.have.been.called;
		});

		it('should be called when child fails in getSnapshotBeforeUpdate', () => {
			ThrowErr.prototype.getSnapshotBeforeUpdate = throwExpectedError;

			render(
				<Receiver>
					<ThrowErr />
				</Receiver>,
				scratch
			);
			thrower.forceUpdate();
			rerender();

			expect(Receiver.getDerivedStateFromError).to.have.been.calledWith(
				expectedError
			);
		});

		it('should be called when child fails in componentDidUpdate', () => {
			ThrowErr.prototype.componentDidUpdate = throwExpectedError;

			render(
				<Receiver>
					<ThrowErr />
				</Receiver>,
				scratch
			);

			thrower.forceUpdate();
			rerender();
			expect(Receiver.getDerivedStateFromError).to.have.been.calledWith(
				expectedError
			);
		});

		it('should be called when child fails in componentWillUpdate', () => {
			ThrowErr.prototype.componentWillUpdate = throwExpectedError;

			render(
				<Receiver>
					<ThrowErr />
				</Receiver>,
				scratch
			);

			thrower.forceUpdate();
			rerender();
			expect(Receiver.getDerivedStateFromError).to.have.been.calledWith(
				expectedError
			);
		});

		it('should be called when child fails in componentWillReceiveProps', () => {
			ThrowErr.prototype.componentWillReceiveProps = throwExpectedError;

			let receiver;
			class Receiver extends Component {
				constructor() {
					super();
					this.state = { foo: 'bar' };
					receiver = this;
				}
				static getDerivedStateFromError(error) {
					return { error };
				}
				render() {
					return this.state.error ? (
						String(this.state.error)
					) : (
						<ThrowErr foo={this.state.foo} />
					);
				}
			}

			sinon.spy(Receiver, 'getDerivedStateFromError');
			render(<Receiver />, scratch);

			receiver.setState({ foo: 'baz' });
			rerender();
			expect(Receiver.getDerivedStateFromError).to.have.been.calledWith(
				expectedError
			);
		});

		it('should be called when child fails in shouldComponentUpdate', () => {
			ThrowErr.prototype.shouldComponentUpdate = throwExpectedError;

			let receiver;
			class Receiver extends Component {
				constructor() {
					super();
					this.state = { foo: 'bar' };
					receiver = this;
				}
				static getDerivedStateFromError(error) {
					return { error };
				}
				render() {
					return this.state.error ? (
						String(this.state.error)
					) : (
						<ThrowErr foo={this.state.foo} />
					);
				}
			}

			sinon.spy(Receiver, 'getDerivedStateFromError');
			render(<Receiver />, scratch);

			receiver.setState({ foo: 'baz' });
			rerender();

			expect(Receiver.getDerivedStateFromError).to.have.been.calledWith(
				expectedError
			);
		});

		it('should be called when child fails in componentWillUnmount', () => {
			ThrowErr.prototype.componentWillUnmount = throwExpectedError;

			render(
				<Receiver>
					<ThrowErr />
				</Receiver>,
				scratch
			);
			render(
				<Receiver>
					<div />
				</Receiver>,
				scratch
			);
			expect(Receiver.getDerivedStateFromError).to.have.been.calledWith(
				expectedError
			);
		});

		it('should be called when applying a Component ref', () => {
			const Foo = () => <div />;

			const ref = value => {
				if (value) {
					throwExpectedError();
				}
			};

			// In React, an error boundary handles it's own refs:
			// https://codesandbox.io/s/react-throwing-refs-lk958
			class Receiver extends Component {
				static getDerivedStateFromError(error) {
					return { error };
				}
				render() {
					return this.state.error ? (
						String(this.state.error)
					) : (
						<Foo ref={ref} />
					);
				}
			}

			sinon.spy(Receiver, 'getDerivedStateFromError');
			render(<Receiver />, scratch);
			expect(Receiver.getDerivedStateFromError).to.have.been.calledWith(
				expectedError
			);
		});

		it('should be called when applying a DOM ref', () => {
			const ref = value => {
				if (value) {
					throwExpectedError();
				}
			};

			// In React, an error boundary handles it's own refs:
			// https://codesandbox.io/s/react-throwing-refs-lk958
			class Receiver extends Component {
				static getDerivedStateFromError(error) {
					return { error };
				}
				render() {
					return this.state.error ? (
						String(this.state.error)
					) : (
						<div ref={ref} />
					);
				}
			}

			sinon.spy(Receiver, 'getDerivedStateFromError');
			render(
				<Receiver>
					<ThrowErr />
				</Receiver>,
				scratch
			);
			expect(Receiver.getDerivedStateFromError).to.have.been.calledWith(
				expectedError
			);
		});

		it('should be called when unmounting a ref', () => {
			const ref = value => {
				if (value == null) {
					throwExpectedError();
				}
			};

			ThrowErr.prototype.render = () => <div ref={ref} />;

			render(
				<Receiver>
					<ThrowErr />
				</Receiver>,
				scratch
			);
			render(
				<Receiver>
					<div />
				</Receiver>,
				scratch
			);
			expect(Receiver.getDerivedStateFromError).to.have.been.calledOnceWith(
				expectedError
			);
		});

		it('should be called when functional child fails', () => {
			function ThrowErr() {
				throwExpectedError();
			}

			render(
				<Receiver>
					<ThrowErr />
				</Receiver>,
				scratch
			);
			expect(Receiver.getDerivedStateFromError).to.have.been.calledWith(
				expectedError
			);
		});

		it('should re-render with new content', () => {
			class ThrowErr extends Component {
				componentWillMount() {
					throw new Error('Error contents');
				}
				render() {
					return 'No error!?!?';
				}
			}

			render(
				<Receiver>
					<ThrowErr />
				</Receiver>,
				scratch
			);
			rerender();
			expect(scratch).to.have.property('textContent', 'Error: Error contents');
		});

		it('should be able to adapt and rethrow errors', () => {
			let adaptedError;
			class Adapter extends Component {
				static getDerivedStateFromError(error) {
					throw (adaptedError = new Error(
						'Adapted ' +
							String(error && 'message' in error ? error.message : error)
					));
				}
				render() {
					return <div>{this.props.children}</div>;
				}
			}

			function ThrowErr() {
				throwExpectedError();
			}

			sinon.spy(Adapter, 'getDerivedStateFromError');
			render(
				<Receiver>
					<Adapter>
						<ThrowErr />
					</Adapter>
				</Receiver>,
				scratch
			);

			expect(Adapter.getDerivedStateFromError).to.have.been.calledWith(
				expectedError
			);
			expect(Receiver.getDerivedStateFromError).to.have.been.calledWith(
				adaptedError
			);

			rerender();
			expect(scratch).to.have.property('textContent', 'Error: Adapted Error!');
		});

		it('should bubble on repeated errors', () => {
			class Adapter extends Component {
				static getDerivedStateFromError(error) {
					return { error };
				}
				render() {
					// But fail at doing so
					if (this.state.error) {
						throw this.state.error;
					}
					return <div>{this.props.children}</div>;
				}
			}

			function ThrowErr() {
				throwExpectedError();
			}

			sinon.spy(Adapter, 'getDerivedStateFromError');

			render(
				<Receiver>
					<Adapter>
						<ThrowErr />
					</Adapter>
				</Receiver>,
				scratch
			);
			rerender();

			expect(Adapter.getDerivedStateFromError).to.have.been.calledWith(
				expectedError
			);
			expect(Receiver.getDerivedStateFromError).to.have.been.calledWith(
				expectedError
			);
			expect(scratch).to.have.property('textContent', 'Error: Error!');
		});

		it('should bubble on ignored errors', () => {
			class Adapter extends Component {
				static getDerivedStateFromError(error) {
					// Ignore the error
					return null;
				}
				render() {
					return <div>{this.props.children}</div>;
				}
			}

			function ThrowErr() {
				throw new Error('Error!');
			}

			sinon.spy(Adapter, 'getDerivedStateFromError');

			render(
				<Receiver>
					<Adapter>
						<ThrowErr />
					</Adapter>
				</Receiver>,
				scratch
			);
			rerender();

			expect(Adapter.getDerivedStateFromError).to.have.been.called;
			expect(Receiver.getDerivedStateFromError).to.have.been.called;
			expect(scratch).to.have.property('textContent', 'Error: Error!');
		});

		it('should not bubble on caught errors', () => {
			class TopReceiver extends Component {
				static getDerivedStateFromError(error) {
					return { error };
				}
				render() {
					return (
						<div>
							{this.state.error
								? String(this.state.error)
								: this.props.children}
						</div>
					);
				}
			}

			function ThrowErr() {
				throwExpectedError();
			}

			sinon.spy(TopReceiver, 'getDerivedStateFromError');

			render(
				<TopReceiver>
					<Receiver>
						<ThrowErr />
					</Receiver>
				</TopReceiver>,
				scratch
			);
			rerender();

			expect(TopReceiver.getDerivedStateFromError).not.to.have.been.called;
			expect(Receiver.getDerivedStateFromError).to.have.been.calledWith(
				expectedError
			);
			expect(scratch).to.have.property('textContent', 'Error: Error!');
		});

		it('should be called through non-component parent elements', () => {
			ThrowErr.prototype.render = throwExpectedError;

			render(
				<Receiver>
					<div>
						<ThrowErr />
					</div>
				</Receiver>,
				scratch
			);
			expect(Receiver.getDerivedStateFromError).to.have.been.calledWith(
				expectedError
			);
		});

		it('should bubble up when ref throws on component that is not an error boundary', () => {
			const ref = value => {
				if (value) {
					throwExpectedError();
				}
			};

			function ThrowErr() {
				return <div ref={ref} />;
			}

			render(
				<Receiver>
					<ThrowErr />
				</Receiver>,
				scratch
			);
			expect(Receiver.getDerivedStateFromError).to.have.been.calledWith(
				expectedError
			);
		});

		it.skip('should successfully unmount constantly throwing ref', () => {
			const buggyRef = throwExpectedError;

			function ThrowErr() {
				return <div ref={buggyRef}>ThrowErr</div>;
			}

			render(
				<Receiver>
					<ThrowErr />
				</Receiver>,
				scratch
			);
			rerender();

			expect(scratch.innerHTML).to.equal('<div>Error: Error!</div>');
		});
	});
});
