import { createElement, render, Component } from 'preact';
import { act } from 'preact/test-utils';
import { setupScratch, teardown } from '../../../test/_util/helpers';
import { useEffect } from 'preact/hooks';

/** @jsx createElement */

describe('errorInfo', () => {
	/** @type {HTMLDivElement} */
	let scratch;

	beforeEach(() => {
		scratch = setupScratch();
	});

	afterEach(() => {
		teardown(scratch);
	});

	it('should pass errorInfo on hook unmount error', () => {
		let info;
		let update;
		class Receiver extends Component {
			constructor(props) {
				super(props);
				this.state = { error: null, i: 0 };
				update = this.setState.bind(this);
			}
			componentDidCatch(error, errorInfo) {
				info = errorInfo;
				this.setState({ error });
			}
			render() {
				if (this.state.error) return <div />;
				if (this.state.i === 0) return <ThrowErr />;
				return null;
			}
		}

		function ThrowErr() {
			useEffect(() => {
				return () => {
					throw new Error('fail');
				};
			}, []);

			return <h1 />;
		}

		act(() => {
			render(<Receiver />, scratch);
		});

		act(() => {
			update({ i: 1 });
		});

		expect(info).to.deep.equal({});
	});
});
