import { h, render } from '../../src/preact';
/** @jsx h */

function getAttributes(node) {
	let attrs = {};
	for (let i=node.attributes.length; i--; ) {
		attrs[node.attributes[i].name] = node.attributes[i].value;
	}
	return attrs;
}

describe('render()', () => {
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

	it('should create empty nodes (<* />)', () => {
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
		expect(scratch.childNodes).to.have.length(2);
		expect(scratch.childNodes[0]).to.have.property('nodeName', 'FOO');
		expect(scratch.childNodes[1]).to.have.property('nodeName', 'X-BAR');
	});

	it('should nest empty nodes', () => {
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
		expect(c).to.have.length(3);
		expect(c).to.have.deep.property('0.nodeName', 'SPAN');
		expect(c).to.have.deep.property('1.nodeName', 'FOO');
		expect(c).to.have.deep.property('2.nodeName', 'X-BAR');
	});

	it('should not render falsey values', () => {
		render((
			<div>
				{null},{undefined},{false},{0},{NaN}
			</div>
		), scratch);

		expect(scratch.firstChild).to.have.property('innerHTML', ',,,0,NaN');
	});

	it('should clear falsey attributes', () => {
		let root = render((
			<div anull="anull" aundefined="aundefined" afalse="afalse" anan="aNaN" a0="a0" />
		), scratch);

		root = render((
			<div anull={null} aundefined={undefined} afalse={false} anan={NaN} a0={0} />
		), scratch, root);

		expect(getAttributes(scratch.firstChild), 'from previous truthy values').to.eql({
			a0: '0',
			anan: 'NaN'
		});

		scratch.innerHTML = '';

		root = render((
			<div anull={null} aundefined={undefined} afalse={false} anan={NaN} a0={0} />
		), scratch);

		expect(getAttributes(scratch.firstChild), 'initial render').to.eql({
			a0: '0',
			anan: 'NaN'
		});
	});

	it('should clear falsey input values', () => {
		let root = render((
			<div>
				<input value={0} />
				<input value={false} />
				<input value={null} />
				<input value={undefined} />
			</div>
		), scratch);

		expect(root.children[0]).to.have.property('value', '0');
		expect(root.children[1]).to.have.property('value', 'false');
		expect(root.children[2]).to.have.property('value', '');
		expect(root.children[3]).to.have.property('value', '');
	});

	it('should clear falsey DOM properties', () => {
		let root;
		function test(val) {
			root = render((
				<div>
					<input value={val} />
					<table border={val} />
				</div>
			), scratch, root);
		}

		test('2');
		test(false);
		expect(scratch).to.have.property('innerHTML', '<div><input><table></table></div>', 'for false');

		test('3');
		test(null);
		expect(scratch).to.have.property('innerHTML', '<div><input><table></table></div>', 'for null');

		test('4');
		test(undefined);
		expect(scratch).to.have.property('innerHTML', '<div><input><table></table></div>', 'for undefined');
	});

	it('should apply string attributes', () => {
		render(<div foo="bar" data-foo="databar" />, scratch);

		let div = scratch.childNodes[0];
		expect(div).to.have.deep.property('attributes.length', 2);

		expect(div).to.have.deep.property('attributes[0].name', 'foo');
		expect(div).to.have.deep.property('attributes[0].value', 'bar');

		expect(div).to.have.deep.property('attributes[1].name', 'data-foo');
		expect(div).to.have.deep.property('attributes[1].value', 'databar');
	});

	it('should apply class as String', () => {
		render(<div class="foo" />, scratch);
		expect(scratch.childNodes[0]).to.have.property('className', 'foo');
	});

	it('should alias className to class', () => {
		render(<div className="bar" />, scratch);
		expect(scratch.childNodes[0]).to.have.property('className', 'bar');
	});

	it('should apply style as String', () => {
		render(<div style="top:5px; position:relative;" />, scratch);
		expect(scratch.childNodes[0]).to.have.deep.property('style.cssText')
			.that.matches(/top\s*:\s*5px\s*/)
			.and.matches(/position\s*:\s*relative\s*/);
	});

	it('should only register on* functions as handlers', () => {
		let click = () => {},
			onclick = () => {};

		let proto = document.createElement('div').constructor.prototype;

		sinon.spy(proto, 'addEventListener');

		render(<div click={ click } onClick={ onclick } />, scratch);

		expect(scratch.childNodes[0]).to.have.deep.property('attributes.length', 0);

		expect(proto.addEventListener).to.have.been.calledOnce
			.and.to.have.been.calledWithExactly('click', sinon.match.func);

		proto.addEventListener.restore();
	});

	it('should add and remove event handlers', () => {
		let click = sinon.spy(),
			mousedown = sinon.spy();

		let proto = document.createElement('div').constructor.prototype;
		sinon.spy(proto, 'addEventListener');
		sinon.spy(proto, 'removeEventListener');

		function fireEvent(on, type) {
			let e = document.createEvent('Event');
			e.initEvent(type, true, true);
			on.dispatchEvent(e);
		}

		render(<div onClick={ () => click(1) } onMouseDown={ mousedown } />, scratch);

		expect(proto.addEventListener).to.have.been.calledTwice
			.and.to.have.been.calledWith('click')
			.and.calledWith('mousedown');

		fireEvent(scratch.childNodes[0], 'click');
		expect(click).to.have.been.calledOnce
			.and.calledWith(1);

		proto.addEventListener.reset();
		click.reset();

		render(<div onClick={ () => click(2) } />, scratch, scratch.firstChild);

		expect(proto.addEventListener).not.to.have.been.called;

		expect(proto.removeEventListener)
			.to.have.been.calledOnce
			.and.calledWith('mousedown');

		fireEvent(scratch.childNodes[0], 'click');
		expect(click).to.have.been.calledOnce
			.and.to.have.been.calledWith(2);

		fireEvent(scratch.childNodes[0], 'mousedown');
		expect(mousedown).not.to.have.been.called;

		proto.removeEventListener.reset();
		click.reset();
		mousedown.reset();

		render(<div />, scratch, scratch.firstChild);

		expect(proto.removeEventListener)
			.to.have.been.calledOnce
			.and.calledWith('click');

		fireEvent(scratch.childNodes[0], 'click');
		expect(click).not.to.have.been.called;

		proto.addEventListener.restore();
		proto.removeEventListener.restore();
	});

	it('should serialize style objects', () => {
		let root = render((
			<div style={{
				color: 'rgb(255, 255, 255)',
				background: 'rgb(255, 100, 0)',
				backgroundPosition: '10px 10px',
				'background-size': 'cover',
				padding: 5,
				top: 100,
				left: '100%'
			}}>
				test
			</div>
		), scratch);

		let { style } = scratch.childNodes[0];
		expect(style).to.have.property('color').that.equals('rgb(255, 255, 255)');
		expect(style).to.have.property('background').that.contains('rgb(255, 100, 0)');
		expect(style).to.have.property('backgroundPosition').that.equals('10px 10px');
		expect(style).to.have.property('backgroundSize', 'cover');
		expect(style).to.have.property('padding', '5px');
		expect(style).to.have.property('top', '100px');
		expect(style).to.have.property('left', '100%');

		root = render((
			<div style={{ color: 'rgb(0, 255, 255)' }}>test</div>
		), scratch, root);

		expect(root).to.have.deep.property('style.cssText').that.equals('color: rgb(0, 255, 255);');

		root = render((
			<div style="display: inline;">test</div>
		), scratch, root);

		expect(root).to.have.deep.property('style.cssText').that.equals('display: inline;');

		root = render((
			<div style={{ backgroundColor: 'rgb(0, 255, 255)' }}>test</div>
		), scratch, root);

		expect(root).to.have.deep.property('style.cssText').that.equals('background-color: rgb(0, 255, 255);');
	});

	it('should serialize class/className', () => {
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

	it('should support dangerouslySetInnerHTML', () => {
		let html = '<b>foo &amp; bar</b>';
		let root = render(<div dangerouslySetInnerHTML={{ __html: html }} />, scratch);

		expect(scratch.firstChild).to.have.property('innerHTML', html);
		expect(scratch.innerHTML).to.equal('<div>'+html+'</div>');

		root = render(<div>a<strong>b</strong></div>, scratch, root);

		expect(scratch).to.have.property('innerHTML', `<div>a<strong>b</strong></div>`);

		root = render(<div dangerouslySetInnerHTML={{ __html: html }} />, scratch, root);

		expect(scratch.innerHTML).to.equal('<div>'+html+'</div>');
	});

	it('should reconcile mutated DOM attributes', () => {
		let check = p => render(<input type="checkbox" checked={p} />, scratch, scratch.lastChild),
			value = () => scratch.lastChild.checked,
			setValue = p => scratch.lastChild.checked = p;
		check(true);
		expect(value()).to.equal(true);
		check(false);
		expect(value()).to.equal(false);
		check(true);
		expect(value()).to.equal(true);
		setValue(true);
		check(false);
		expect(value()).to.equal(false);
		setValue(false);
		check(true);
		expect(value()).to.equal(true);
	});

	it('should ignore props.children if children are manually specified', () => {
		expect(
			<div a children={['a', 'b']}>c</div>
		).to.eql(
			<div a>c</div>
		);
	});

	it('should reorder child pairs', () => {
		let root = render((
			<div>
				<a>a</a>
				<b>b</b>
			</div>
		), scratch, root);

		let a = scratch.firstChild.firstChild;
		let b = scratch.firstChild.lastChild;

		expect(a).to.have.property('nodeName', 'A');
		expect(b).to.have.property('nodeName', 'B');

		root = render((
			<div>
				<b>b</b>
				<a>a</a>
			</div>
		), scratch, root);

		expect(scratch.firstChild.firstChild).to.have.property('nodeName', 'B');
		expect(scratch.firstChild.lastChild).to.have.property('nodeName', 'A');
		expect(scratch.firstChild.firstChild).to.equal(b);
		expect(scratch.firstChild.lastChild).to.equal(a);
	});
});
