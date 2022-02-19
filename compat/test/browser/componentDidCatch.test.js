import React, { render, Component } from 'preact/compat';
import { setupScratch, teardown } from '../../../test/_util/helpers';
import { act } from 'preact/test-utils';

describe('componentDidCatch', () => {
	let scratch;

	beforeEach(() => {
		scratch = setupScratch();
	});

	afterEach(() => {
		teardown(scratch);
	});

	it('should pass errorInfo in compat', () => {
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
			throw new Error('fail');
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
