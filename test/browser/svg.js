import { h, render } from '../../src/preact';
/** @jsx h */

describe('svg', () => {
	let scratch;

	before( () => {
		scratch = document.createElement('div');
		(document.body || document.documentElement).appendChild(scratch);
	});

	beforeEach( () => {
		scratch.innerHTML = '';
	});

	after( () => {
		scratch.parentNode.removeChild(scratch);
		scratch = null;
	});

	it('should render SVG to string', () => {
		render((
			<svg viewBox="0 0 360 360">
				<path stroke="white" fill="black" d="M347.1 357.9L183.3 256.5 13 357.9V1.7h334.1v356.2zM58.5 47.2v231.4l124.8-74.1 118.3 72.8V47.2H58.5z" />
			</svg>
		), scratch);

		expect(scratch.innerHTML).to.equal(`
			<svg viewBox="0 0 360 360">
				<path stroke="white" fill="black" d="M347.1 357.9L183.3 256.5 13 357.9V1.7h334.1v356.2zM58.5 47.2v231.4l124.8-74.1 118.3 72.8V47.2H58.5z"></path>
			</svg>
		`.replace(/[\n\t]+/g,''));
	});

	it('should render SVG to DOM', () => {
		const Demo = () => (
			<svg viewBox="0 0 360 360">
				<path stroke="white" fill="black" d="M347.1 357.9L183.3 256.5 13 357.9V1.7h334.1v356.2zM58.5 47.2v231.4l124.8-74.1 118.3 72.8V47.2H58.5z" />
			</svg>
		);
		render(<Demo />, scratch);

		expect(scratch.innerHTML).to.equal('<svg viewBox="0 0 360 360"><path stroke="white" fill="black" d="M347.1 357.9L183.3 256.5 13 357.9V1.7h334.1v356.2zM58.5 47.2v231.4l124.8-74.1 118.3 72.8V47.2H58.5z"></path></svg>');
	});

	it('should use attributes for className', () => {
		const Demo = ({ c }) => (
			<svg viewBox="0 0 360 360" {...(c ? {class:'foo_'+c} : {})}>
				<path class={c && ('bar_'+c)} stroke="white" fill="black" d="M347.1 357.9L183.3 256.5 13 357.9V1.7h334.1v356.2zM58.5 47.2v231.4l124.8-74.1 118.3 72.8V47.2H58.5z" />
			</svg>
		);
		let root = render(<Demo c="1" />, scratch, root);
		sinon.spy(root, 'removeAttribute');
		root = render(<Demo />, scratch, root);
		expect(root.removeAttribute).to.have.been.calledOnce.and.calledWith('class');
		root.removeAttribute.restore();

		root = render(<div />, scratch, root);
		root = render(<Demo />, scratch, root);
		sinon.spy(root, 'setAttribute');
		root = render(<Demo c="2" />, scratch, root);
		expect(root.setAttribute).to.have.been.calledOnce.and.calledWith('class', 'foo_2');
		root.setAttribute.restore();
		root = render(<Demo c="3" />, scratch, root);
		root = render(<Demo />, scratch, root);
	});

	it('should still support class attribute', () => {
		render((
			<svg viewBox="0 0 1 1" class="foo bar" />
		), scratch);

		expect(scratch.innerHTML).to.equal(`<svg viewBox="0 0 1 1" class="foo bar"></svg>`);
	});
});
