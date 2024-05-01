import { createElement, Component, render } from 'preact';
import { setupRerender } from 'preact/test-utils';
import { setupScratch, teardown } from '../_util/helpers';

/** @jsx createElement */

describe('mathml', () => {
	let scratch;

	beforeEach(() => {
		scratch = setupScratch();
	});

	afterEach(() => {
		teardown(scratch);
	});

	it('should render with the correct namespace URI', () => {
		render(<math />, scratch);

		let namespace = scratch.querySelector('math').namespaceURI;

		expect(namespace).to.equal('http://www.w3.org/1998/Math/MathML');
	});

	it('should render children with the correct namespace URI', () => {
		render(
			<math>
				<mrow />
			</math>,
			scratch
		);

		let namespace = scratch.querySelector('mrow').namespaceURI;

		expect(namespace).to.equal('http://www.w3.org/1998/Math/MathML');
	});

	it('should inherit correct namespace URI from parent', () => {
		const math = document.createElementNS(
			'http://www.w3.org/1998/Math/MathML',
			'math'
		);
		scratch.appendChild(math);

		render(<mrow />, scratch.firstChild);

		let namespace = scratch.querySelector('mrow').namespaceURI;
		expect(namespace).to.equal('http://www.w3.org/1998/Math/MathML');
	});

	it('should inherit correct namespace URI from parent upon updating', () => {
		setupRerender();

		const math = document.createElementNS(
			'http://www.w3.org/1998/Math/MathML',
			'math'
		);
		scratch.appendChild(math);

		class App extends Component {
			state = { show: true };
			componentDidMount() {
				// eslint-disable-next-line
				this.setState({ show: false }, () => {
					expect(scratch.querySelector('mo').namespaceURI).to.equal(
						'http://www.w3.org/1998/Math/MathML'
					);
				});
			}
			render() {
				return this.state.show ? <mi>1</mi> : <mo>2</mo>;
			}
		}

		render(<App />, scratch.firstChild);
	});

	it('should transition from DOM to MathML and back', () => {
		render(
			<div>
				<math>
					<msup>
						<mi>c</mi>
						<mn>2</mn>
					</msup>
				</math>
			</div>,
			scratch
		);

		expect(scratch.firstChild).to.be.an('HTMLDivElement');
		expect(scratch.firstChild.firstChild).to.be.an('MathMLElement');
	});
});
