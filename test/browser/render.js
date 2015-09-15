import { h, render } from '../../preact';
let { expect } = chai;

/** @jsx h */

describe('render()', () => {
	var scratch;

	before( () => {
		scratch = document.createElement('div');
		(document.body || document.documentElement).appendChild(scratch);
	});

	after( () => {
		scratch.parentNode.removeChild(scratch);
		scratch = null;
	});

	it('should basic empty nodes (<* />)', () => {
		scratch.innerHTML = '';

		render(<div />, scratch);
		expect(scratch.childNodes)
			.to.have.length(1)
			.and.to.have.deep.property('0.nodeName', 'DIV');

		scratch.innerHTML = '';

		render(<span />, scratch);
		expect(scratch.childNodes)
			.to.have.length(1)
			.and.to.have.deep.property('0.nodeName', 'SPAN');

		scratch.innerHTML = '';

		render(<foo />, scratch);
		render(<x-bar />, scratch);
		expect(scratch.childNodes).to.have.length(2)
		expect(scratch.childNodes[0]).to.have.property('nodeName', 'FOO');
		expect(scratch.childNodes[1]).to.have.property('nodeName', 'X-BAR');
	});

	it('should nested empty nodes', () => {
		scratch.innerHTML = '';

		render((
			<div>
				<span />
				<foo />
				<x-bar />
			</div>
		), scratch);

		expect(scratch.childNodes)
			.to.have.length(1)
			.and.to.have.deep.property('0.nodeName', 'DIV');

		let c = scratch.childNodes[0].childNodes;
		expect(c).to.have.length(3)
		expect(c).to.have.deep.property('0.nodeName', 'SPAN')
		expect(c).to.have.deep.property('1.nodeName', 'FOO')
		expect(c).to.have.deep.property('2.nodeName', 'X-BAR');
	});

	it('should apply string attributes', () => {
		scratch.innerHTML = '';

		render(<div foo="bar" data-foo="databar" />, scratch);

		let div = scratch.childNodes[0];
		expect(div).to.have.deep.property('attributes.length', 2);

		expect(div).to.have.deep.property('attributes[0].name', 'foo');
		expect(div).to.have.deep.property('attributes[0].value', 'bar');

		expect(div).to.have.deep.property('attributes[1].name', 'data-foo');
		expect(div).to.have.deep.property('attributes[1].value', 'databar');
	});

	it('should apply class/className as String', () => {
		scratch.innerHTML = '';
		render(<div class="foo" />, scratch);
		expect(scratch.childNodes[0]).to.have.property('className', 'foo');

		scratch.innerHTML = '';
		render(<div className="bar" />, scratch);
		expect(scratch.childNodes[0]).to.have.property('className', 'bar');
	});

	it('should apply style as String', () => {
		scratch.innerHTML = '';
		render(<div style="top:5px; position:relative;" />, scratch);
		expect(scratch.childNodes[0]).to.have.deep.property('style.cssText')
			.that.matches(/top\s*:\s*5px\s*/)
			.and.matches(/position\s*:\s*relative\s*/);
	});

	it('should only register on* functions as handlers', () => {
		scratch.innerHTML = '';

		let click = () => {},
			onclick = () => {},
			calls = [];

		let proto = document.createElement('div').constructor.prototype;

		sinon.spy(proto, 'addEventListener');

		render(<div click={ click } onClick={ onclick } />, scratch);

		expect(scratch.childNodes[0]).to.have.deep.property('attributes.length', 0);

		expect(proto.addEventListener).to.have.been.calledOnce
			.and.to.have.been.calledWithExactly('click', sinon.match.func);

		proto.addEventListener.restore();
	});

	it('should serialize style objects', () => {
		scratch.innerHTML = '';

		render(<div style={{
			color: 'rgb(255, 255, 255)',
			background: 'rgb(255, 100, 0)',
			backgroundPosition: '0 0',
			'background-size': 'cover',
			padding: 5,
			top: 100,
			left: '100%'
		}} />, scratch);

		let { style } = scratch.childNodes[0];
		expect(style).to.have.property('color', 'rgb(255, 255, 255)');
		expect(style).to.have.property('background').that.contains('rgb(255, 100, 0)');
		expect(style).to.have.property('backgroundPosition').that.matches(/0(px)? 0(px)?/);
		expect(style).to.have.property('backgroundSize', 'cover');
		expect(style).to.have.property('padding', '5px');
		expect(style).to.have.property('top', '100px');
		expect(style).to.have.property('left', '100%');
	});

	it('should serialize class/className', () => {
		scratch.innerHTML = '';

		render(<div class={{
			no1: false,
			no2: 0,
			no3: null,
			no4: undefined,
			no5: '',
			yes1: true,
			yes2: 1,
			yes3: {},
			yes4: [],
			yes5: ' '
		}} />, scratch);

		let { className } = scratch.childNodes[0];
		expect(className).to.be.a.string;
		expect(className.split(' '))
			.to.include.members(['yes1', 'yes2', 'yes3', 'yes4', 'yes5'])
			.and.not.include.members(['no1', 'no2', 'no3', 'no4', 'no5']);
	});
});
