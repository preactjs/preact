import { setupRerender } from 'preact/test-utils';
import { createElement, render, Component, Fragment } from 'preact';
import { setupScratch, teardown } from '../../_util/helpers';
import { vi } from 'vitest';

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

	describe('#componentDidCatch', () => {
		/** @type {Error} */
		let expectedError;

		/** @type {typeof import('../../../').Component} */
		let ThrowErr;
		class Receiver extends Component {
			componentDidCatch(error) {
				this.setState({ error });
			}

			render() {
				return this.state.error
					? String(this.state.error)
					: this.props.children;
			}
		}

		let thrower;

		vi.spyOn(Receiver.prototype, 'componentDidCatch');
		vi.spyOn(Receiver.prototype, 'render');

		function throwExpectedError() {
			throw (expectedError = new Error('Error!'));
		}

		beforeEach(() => {
			ThrowErr = class ThrowErr extends Component {
				constructor(props) {
					super(props);
					thrower = this;
				}

				componentDidCatch() {
					expect.fail("Throwing component should not catch it's own error.");
				}
				render() {
					return <div>ThrowErr: componentDidCatch</div>;
				}
			};
			vi.spyOn(ThrowErr.prototype, 'componentDidCatch');

			expectedError = undefined;

			Receiver.prototype.componentDidCatch.mockClear();
			Receiver.prototype.render.mockClear();
		});

		afterEach(() => {
			expect(
				ThrowErr.prototype.componentDidCatch,
				"Throwing component should not catch it's own error."
			).not.toHaveBeenCalled();
			thrower = undefined;
		});

		it('should be called when child fails in constructor', () => {
			class ThrowErr extends Component {
				constructor(props, context) {
					super(props, context);
					throwExpectedError();
				}
				componentDidCatch() {
					expect.fail("Throwing component should not catch it's own error");
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

			expect(Receiver.prototype.componentDidCatch).toHaveBeenCalledWith(
				expectedError,
				expect.anything()
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
			expect(Receiver.prototype.componentDidCatch).toHaveBeenCalledWith(
				expectedError,
				expect.anything()
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
			expect(Receiver.prototype.componentDidCatch).toHaveBeenCalledWith(
				expectedError,
				expect.anything()
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
			expect(Receiver.prototype.componentDidCatch).toHaveBeenCalledWith(
				expectedError,
				expect.anything()
			);
		});

		it('should be called when child fails in getDerivedStateFromProps', () => {
			ThrowErr.getDerivedStateFromProps = throwExpectedError;

			vi.spyOn(ThrowErr.prototype, 'render');
			render(
				<Receiver>
					<ThrowErr />
				</Receiver>,
				scratch
			);

			expect(Receiver.prototype.componentDidCatch).toHaveBeenCalledWith(
				expectedError,
				expect.anything()
			);
			expect(ThrowErr.prototype.render).not.toHaveBeenCalled();
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

			expect(Receiver.prototype.componentDidCatch).toHaveBeenCalledWith(
				expectedError,
				expect.anything()
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
			expect(Receiver.prototype.componentDidCatch).toHaveBeenCalledWith(
				expectedError,
				expect.anything()
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
			expect(Receiver.prototype.componentDidCatch).toHaveBeenCalledWith(
				expectedError,
				expect.anything()
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
				componentDidCatch(error) {
					this.setState({ error });
				}
				render() {
					return this.state.error ? (
						String(this.state.error)
					) : (
						<ThrowErr foo={this.state.foo} />
					);
				}
			}

			vi.spyOn(Receiver.prototype, 'componentDidCatch');
			render(<Receiver />, scratch);

			receiver.setState({ foo: 'baz' });
			rerender();

			expect(Receiver.prototype.componentDidCatch).toHaveBeenCalledWith(
				expectedError,
				expect.anything()
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
				componentDidCatch(error) {
					this.setState({ error });
				}
				render() {
					return this.state.error ? (
						String(this.state.error)
					) : (
						<ThrowErr foo={this.state.foo} />
					);
				}
			}

			vi.spyOn(Receiver.prototype, 'componentDidCatch');
			render(<Receiver />, scratch);

			receiver.setState({ foo: 'baz' });
			rerender();

			expect(Receiver.prototype.componentDidCatch).toHaveBeenCalledWith(
				expectedError,
				expect.anything()
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
			expect(Receiver.prototype.componentDidCatch).toHaveBeenCalledWith(
				expectedError,
				expect.anything()
			);
		});

		it('should be called when applying a Component ref', () => {
			const Foo = props => <div ref={props.ref} />;

			const ref = value => {
				if (value) {
					throwExpectedError();
				}
			};

			// In React, an error boundary handles it's own refs:
			// https://codesandbox.io/s/react-throwing-refs-lk958
			class Receiver extends Component {
				componentDidCatch(error) {
					this.setState({ error });
				}
				render() {
					return this.state.error ? (
						String(this.state.error)
					) : (
						<Foo ref={ref} />
					);
				}
			}

			vi.spyOn(Receiver.prototype, 'componentDidCatch');
			render(<Receiver />, scratch);
			expect(Receiver.prototype.componentDidCatch).toHaveBeenCalledWith(
				expectedError,
				expect.anything()
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
				componentDidCatch(error) {
					this.setState({ error });
				}
				render() {
					return this.state.error ? (
						String(this.state.error)
					) : (
						<div ref={ref} />
					);
				}
			}

			vi.spyOn(Receiver.prototype, 'componentDidCatch');
			render(<Receiver />, scratch);
			expect(Receiver.prototype.componentDidCatch).toHaveBeenCalledWith(
				expectedError,
				expect.anything()
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
			expect(Receiver.prototype.componentDidCatch).toHaveBeenCalledOnce();
			expect(Receiver.prototype.componentDidCatch).toHaveBeenCalledWith(
				expectedError,
				expect.anything()
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
			expect(Receiver.prototype.componentDidCatch).toHaveBeenCalledWith(
				expectedError,
				expect.anything()
			);
		});

		it('should be called when child inside a Fragment fails', () => {
			function ThrowErr() {
				throwExpectedError();
			}

			render(
				<Receiver>
					<Fragment>
						<ThrowErr />
					</Fragment>
				</Receiver>,
				scratch
			);
			expect(Receiver.prototype.componentDidCatch).toHaveBeenCalledWith(
				expectedError,
				expect.anything()
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
				componentDidCatch(error) {
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

			vi.spyOn(Adapter.prototype, 'componentDidCatch');
			render(
				<Receiver>
					<Adapter>
						<ThrowErr />
					</Adapter>
				</Receiver>,
				scratch
			);

			expect(Adapter.prototype.componentDidCatch).toHaveBeenCalledWith(
				expectedError,
				expect.anything()
			);
			expect(Receiver.prototype.componentDidCatch).toHaveBeenCalledWith(
				adaptedError,
				expect.anything()
			);

			rerender();
			expect(scratch).to.have.property('textContent', 'Error: Adapted Error!');
		});

		it('should bubble on repeated errors', () => {
			class Adapter extends Component {
				componentDidCatch(error) {
					// Try to handle the error
					this.setState({ error });
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

			vi.spyOn(Adapter.prototype, 'componentDidCatch');

			render(
				<Receiver>
					<Adapter>
						<ThrowErr />
					</Adapter>
				</Receiver>,
				scratch
			);
			rerender();

			expect(Adapter.prototype.componentDidCatch).toHaveBeenCalledWith(
				expectedError,
				expect.anything()
			);
			expect(Receiver.prototype.componentDidCatch).toHaveBeenCalledWith(
				expectedError,
				expect.anything()
			);
			expect(scratch).to.have.property('textContent', 'Error: Error!');
		});

		it('should bubble on ignored errors', () => {
			class Adapter extends Component {
				componentDidCatch() {
					// Ignore the error
				}
				render() {
					return <div>{this.props.children}</div>;
				}
			}

			function ThrowErr() {
				throw new Error('Error!');
			}

			vi.spyOn(Adapter.prototype, 'componentDidCatch');

			render(
				<Receiver>
					<Adapter>
						<ThrowErr />
					</Adapter>
				</Receiver>,
				scratch
			);
			rerender();

			expect(Adapter.prototype.componentDidCatch).toHaveBeenCalled();
			expect(Receiver.prototype.componentDidCatch).toHaveBeenCalled();
			expect(scratch).to.have.property('textContent', 'Error: Error!');
		});

		it('should not bubble on caught errors', () => {
			class TopReceiver extends Component {
				componentDidCatch(error) {
					this.setState({ error });
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

			vi.spyOn(TopReceiver.prototype, 'componentDidCatch');

			render(
				<TopReceiver>
					<Receiver>
						<ThrowErr />
					</Receiver>
				</TopReceiver>,
				scratch
			);
			rerender();

			expect(TopReceiver.prototype.componentDidCatch).not.toHaveBeenCalled();
			expect(Receiver.prototype.componentDidCatch).toHaveBeenCalledWith(
				expectedError,
				expect.anything()
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
			expect(Receiver.prototype.componentDidCatch).toHaveBeenCalledWith(
				expectedError,
				expect.anything()
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
			expect(Receiver.prototype.componentDidCatch).toHaveBeenCalledWith(
				expectedError,
				expect.anything()
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

		it('should pass errorInfo on render error', () => {
			let info;
			class Receiver extends Component {
				constructor(props) {
					super(props);
					this.state = { error: null };
				}
				componentDidCatch(error, errorInfo) {
					info = errorInfo;
					this.setState({ error });
				}
				render() {
					if (this.state.error) return <div />;
					return this.props.children;
				}
			}

			function ThrowErr() {
				throw new Error('fail');
			}

			render(
				<Receiver>
					<ThrowErr />
				</Receiver>,
				scratch
			);

			expect(info).to.deep.equal({});
		});
	});
});
