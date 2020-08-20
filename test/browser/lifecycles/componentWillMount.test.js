import { createElement, createRoot, Component } from 'preact';
import { setupScratch, teardown } from '../../_util/helpers';

/** @jsx createElement */

describe('Lifecycle methods', () => {
	/** @type {HTMLDivElement} */
	let scratch;

	let render;

	beforeEach(() => {
		scratch = setupScratch();
		({ render } = createRoot(scratch));
	});

	afterEach(() => {
		teardown(scratch);
	});

	describe('#componentWillMount', () => {
		it('should update state when called setState in componentWillMount', () => {
			let componentState;

			class Foo extends Component {
				constructor(props) {
					super(props);
					this.state = {
						value: 0
					};
				}
				componentWillMount() {
					this.setState({ value: 1 });
				}
				render() {
					componentState = this.state;
					return <div />;
				}
			}

			render(<Foo />);

			expect(componentState).to.deep.equal({ value: 1 });
		});
	});
});
