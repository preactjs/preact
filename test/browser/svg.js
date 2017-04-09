import { h, render } from '../../src/preact';
/** @jsx h */


// hacky normalization of attribute order across browsers.
function sortAttributes(html) {
	return html.replace(/<([a-z0-9-]+)((?:\s[a-z0-9:_.-]+=".*?")+)((?:\s*\/)?>)/gi, (s, pre, attrs, after) => {
		let list = attrs.match(/\s[a-z0-9:_.-]+=".*?"/gi).sort( (a, b) => a>b ? 1 : -1 );
		if (~after.indexOf('/')) after = '></'+pre+'>';
		return '<' + pre + list.join('') + after;
	});
}


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
				<path stroke="white" fill="black" d="M 347.1 357.9 L 183.3 256.5 L 13 357.9 V 1.7 h 334.1 v 356.2 Z M 58.5 47.2 v 231.4 l 124.8 -74.1 l 118.3 72.8 V 47.2 H 58.5 Z" />
			</svg>
		), scratch);

		let html = sortAttributes(String(scratch.innerHTML).replace(' xmlns="http://www.w3.org/2000/svg"', ''));
		expect(html).to.equal(sortAttributes(`
			<svg viewBox="0 0 360 360">
				<path d="M 347.1 357.9 L 183.3 256.5 L 13 357.9 V 1.7 h 334.1 v 356.2 Z M 58.5 47.2 v 231.4 l 124.8 -74.1 l 118.3 72.8 V 47.2 H 58.5 Z" fill="black" stroke="white"></path>
			</svg>
		`.replace(/[\n\t]+/g,'')));
	});

	it('should render SVG to DOM', () => {
		const Demo = () => (
			<svg viewBox="0 0 360 360">
				<path d="M 347.1 357.9 L 183.3 256.5 L 13 357.9 V 1.7 h 334.1 v 356.2 Z M 58.5 47.2 v 231.4 l 124.8 -74.1 l 118.3 72.8 V 47.2 H 58.5 Z" fill="black" stroke="white" />
			</svg>
		);
		render(<Demo />, scratch);

		let html = sortAttributes(String(scratch.innerHTML).replace(' xmlns="http://www.w3.org/2000/svg"', ''));
		expect(html).to.equal(sortAttributes('<svg viewBox="0 0 360 360"><path stroke="white" fill="black" d="M 347.1 357.9 L 183.3 256.5 L 13 357.9 V 1.7 h 334.1 v 356.2 Z M 58.5 47.2 v 231.4 l 124.8 -74.1 l 118.3 72.8 V 47.2 H 58.5 Z"></path></svg>'));
	});

	it('should render with the correct namespace URI', () => {
		render(<svg />, scratch);

		let namespace = scratch.querySelector('svg').namespaceURI;

		expect(namespace).to.equal("http://www.w3.org/2000/svg");
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

		expect(scratch.innerHTML).to.contain(` class="foo bar"`);
	});

	it('should switch back to HTML for <foreignObject>', () => {
		render((
			<svg>
				<g>
					<foreignObject>
						<a href="#foo">test</a>
					</foreignObject>
				</g>
			</svg>
		), scratch);

		expect(scratch.getElementsByTagName('a'))
			.to.have.property('0')
			.that.is.a('HTMLAnchorElement');
	});
});
