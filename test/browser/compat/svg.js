import React from '../src';
import assertJsx from 'preact-jsx-chai';
chai.use(assertJsx);

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
		let svg = (
			<svg viewBox="0 0 360 360">
				<path stroke="white" fill="black" d="M347.1 357.9L183.3 256.5 13 357.9V1.7h334.1v356.2zM58.5 47.2v231.4l124.8-74.1 118.3 72.8V47.2H58.5z" />
			</svg>
		);
		// string -> parse
		expect(svg).to.eql(svg);
	});

	it('should render SVG to DOM', () => {
		const Demo = () => (
			<svg viewBox="0 0 360 360">
				<path stroke="white" fill="black" d="M347.1 357.9L183.3 256.5 13 357.9V1.7h334.1v356.2zM58.5 47.2v231.4l124.8-74.1 118.3 72.8V47.2H58.5z" />
			</svg>
		);
		React.render(<Demo />, scratch);

		expect(scratch.innerHTML).to.equal('<svg viewBox="0 0 360 360"><path stroke="white" fill="black" d="M347.1 357.9L183.3 256.5 13 357.9V1.7h334.1v356.2zM58.5 47.2v231.4l124.8-74.1 118.3 72.8V47.2H58.5z"></path></svg>');
	});

	it('should render SVG to DOM', () => {
		React.render((
			<svg viewBox="0 0 100 100">
				<text textAnchor="mid">foo</text>
				<path vectorEffect="non-scaling-stroke" d="M0 0 L100 100" />
			</svg>
		), scratch);

		expect(scratch.innerHTML).to.equal('<svg viewBox="0 0 100 100"><text text-anchor="mid">foo</text><path vector-effect="non-scaling-stroke" d="M0 0 L100 100"></path></svg>');
	});
});
