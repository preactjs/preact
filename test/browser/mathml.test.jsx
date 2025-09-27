import { createElement, Component, render } from 'preact';
import { setupRerender } from 'preact/test-utils';
import { setupScratch, teardown } from '../_util/helpers';

const XHTML_NAMESPACE = 'http://www.w3.org/1999/xhtml';
const MATH_NAMESPACE = 'http://www.w3.org/1998/Math/MathML';

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

		expect(namespace).to.equal(MATH_NAMESPACE);
	});

	it('should render children with the correct namespace URI', () => {
		render(
			<math>
				<mrow />
			</math>,
			scratch
		);

		let namespace = scratch.querySelector('mrow').namespaceURI;

		expect(namespace).to.equal(MATH_NAMESPACE);
	});

	it('should inherit correct namespace URI from parent', () => {
		const math = document.createElementNS(
			MATH_NAMESPACE,
			'math'
		);
		scratch.appendChild(math);

		render(<mrow />, scratch.firstChild);

		let namespace = scratch.querySelector('mrow').namespaceURI;
		expect(namespace).to.equal(MATH_NAMESPACE);
	});

	it('should inherit correct namespace URI from parent upon updating', () => {
		setupRerender();

		const math = document.createElementNS(
			MATH_NAMESPACE,
			'math'
		);
		scratch.appendChild(math);

		class App extends Component {
			state = { show: true };
			componentDidMount() {
				// eslint-disable-next-line
				this.setState({ show: false }, () => {
					expect(scratch.querySelector('mo').namespaceURI).to.equal(
						MATH_NAMESPACE
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

	it('should support XHTML phrasing content within MathML token elements', () => {
		render(
			<div>
				<math>
					<mrow>
						<mi><ins>123</ins></mi>
					</mrow>
				</math>
			</div>,
			scratch
		);

		expect(scratch.querySelector('mi').namespaceURI).to.equal(
			MATH_NAMESPACE
		);
		expect(scratch.querySelector('ins').namespaceURI).to.equal(
			XHTML_NAMESPACE
		);
	});
});
