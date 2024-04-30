import { createElement, render } from 'preact';
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

	it('should use attributes for className', () => {
		const Demo = ({ c }) => (
			<math {...(c ? { class: 'foo_' + c } : {})}>
				<msup>
					<mi>c</mi>
					<mn>2</mn>
				</msup>
			</math>
		);
		render(<Demo c="1" />, scratch);
		let root = scratch.firstChild;
		sinon.spy(root, 'removeAttribute');
		render(<Demo />, scratch);
		expect(root.removeAttribute).to.have.been.calledOnce.and.calledWith(
			'class'
		);

		root.removeAttribute.restore();

		render(<div />, scratch);
		render(<Demo />, scratch);
		root = scratch.firstChild;
		sinon.spy(root, 'setAttribute');
		render(<Demo c="2" />, scratch);
		expect(root.setAttribute).to.have.been.calledOnce.and.calledWith(
			'class',
			'foo_2'
		);

		root.setAttribute.restore();
	});

	it('should support class attribute', () => {
		render(<math class="foo bar" />, scratch);

		expect(scratch.innerHTML).to.contain(` class="foo bar"`);
	});

	it('should support className attribute', () => {
		render(<math className="foo bar" />, scratch);

		expect(scratch.innerHTML).to.contain(` class="foo bar"`);
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
