import { h, render, rerender, Component } from '../../src/preact';
/** @jsx h */

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
			e.initEvent(type);
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
		render(<div dangerouslySetInnerHTML={{ __html: html }} />, scratch);

		expect(scratch.firstChild).to.have.property('innerHTML', html);
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

	it('should render components', () => {
		class C1 extends Component {
			render() {
				return <div>C1</div>;
			}
		}
		sinon.spy(C1.prototype, 'render');
		render(<C1 />, scratch);

		expect(C1.prototype.render)
			.to.have.been.calledOnce
			.and.to.have.been.calledWithMatch({}, {})
			.and.to.have.returned(sinon.match({ nodeName:'div' }));

		expect(scratch.innerHTML).to.equal('<div>C1</div>');
	});

	it('should render components with props', () => {
		const PROPS = { foo:'bar', onBaz:()=>{} };
		let constructorProps;

		class C2 extends Component {
			constructor(props) {
				super(props);
				constructorProps = props;
			}
			render(props) {
				return <div {...props} />;
			}
		}
		sinon.spy(C2.prototype, 'render');

		render(<C2 {...PROPS} />, scratch);

		expect(constructorProps).to.deep.equal(PROPS);

		expect(C2.prototype.render)
			.to.have.been.calledOnce
			.and.to.have.been.calledWithMatch(PROPS, {})
			.and.to.have.returned(sinon.match({
				nodeName: 'div',
				attributes: PROPS
			}));

		expect(scratch.innerHTML).to.equal('<div foo="bar"></div>');
	});

	it('should render functional components', () => {
		const PROPS = { foo:'bar', onBaz:()=>{} };

		const C3 = sinon.spy( props => <div {...props} /> );

		render(<C3 {...PROPS} />, scratch);

		expect(C3)
			.to.have.been.calledOnce
			.and.to.have.been.calledWith(PROPS)
			.and.to.have.returned(sinon.match({
				nodeName: 'div',
				attributes: PROPS
			}));

		expect(scratch.innerHTML).to.equal('<div foo="bar"></div>');
	});

	it('should render nested functional components', () => {
		const PROPS = { foo:'bar', onBaz:()=>{} };

		const Outer = sinon.spy(
			props => <Inner {...props} />
		);

		const Inner = sinon.spy(
			props => <div {...props}>inner</div>
		);

		render(<Outer {...PROPS} />, scratch);

		expect(Outer)
			.to.have.been.calledOnce
			.and.to.have.been.calledWith(PROPS)
			.and.to.have.returned(sinon.match({
				nodeName: Inner,
				attributes: PROPS
			}));

		expect(Inner)
			.to.have.been.calledOnce
			.and.to.have.been.calledWith(PROPS)
			.and.to.have.returned(sinon.match({
				nodeName: 'div',
				attributes: PROPS,
				children: ['inner']
			}));

		expect(scratch.innerHTML).to.equal('<div foo="bar">inner</div>');
	});

	it('should re-render nested functional components', () => {
		let doRender = null;
		class Outer extends Component {
			componentDidMount() {
				let i = 1;
				doRender = () => this.setState({ i: ++i });
			}
			componentWillUnmount() {}
			render(props, { i }) {
				return <Inner i={i} {...props} />;
			}
		}
		sinon.spy(Outer.prototype, 'render');
		sinon.spy(Outer.prototype, 'componentWillUnmount');

		let j = 0;
		const Inner = sinon.spy(
			props => <div j={ ++j } {...props}>inner</div>
		);

		render(<Outer foo="bar" />, scratch);

		// update & flush
		doRender();
		rerender();

		expect(Outer.prototype.componentWillUnmount)
			.not.to.have.been.called;

		expect(Inner).to.have.been.calledTwice;

		expect(Inner.secondCall)
			.to.have.been.calledWith({ foo:'bar', i:2 })
			.and.to.have.returned(sinon.match({
				attributes: {
					j: 2,
					i: 2,
					foo: 'bar'
				}
			}));

		expect(scratch.innerHTML).to.equal('<div j="2" foo="bar" i="2">inner</div>');

		// update & flush
		doRender();
		rerender();

		expect(Inner).to.have.been.calledThrice;

		expect(Inner.thirdCall)
			.to.have.been.calledWith({ foo:'bar', i:3 })
			.and.to.have.returned(sinon.match({
				attributes: {
					j: 3,
					i: 3,
					foo: 'bar'
				}
			}));

		expect(scratch.innerHTML).to.equal('<div j="3" foo="bar" i="3">inner</div>');
	});

	it('should re-render nested components', () => {
		let doRender = null;
		class Outer extends Component {
			componentDidMount() {
				let i = 1;
				doRender = () => this.setState({ i: ++i });
			}
			componentWillUnmount() {}
			render(props, { i }) {
				return <Inner i={i} {...props} />;
			}
		}
		sinon.spy(Outer.prototype, 'render');
		sinon.spy(Outer.prototype, 'componentDidMount');
		sinon.spy(Outer.prototype, 'componentWillUnmount');

		let j = 0;
		class Inner extends Component {
			constructor(...args) {
				super();
				this._constructor(...args);
			}
			_constructor() {}
			componentDidMount() {}
			componentWillUnmount() {}
			render(props) {
				return <div j={ ++j } {...props}>inner</div>;
			}
		}
		sinon.spy(Inner.prototype, '_constructor');
		sinon.spy(Inner.prototype, 'render');
		sinon.spy(Inner.prototype, 'componentDidMount');
		sinon.spy(Inner.prototype, 'componentWillUnmount');

		render(<Outer foo="bar" />, scratch);

		expect(Outer.prototype.componentDidMount).to.have.been.calledOnce;

		// update & flush
		doRender();
		rerender();

		expect(Outer.prototype.componentWillUnmount).not.to.have.been.called;

		expect(Inner.prototype._constructor).to.have.been.calledOnce;
		expect(Inner.prototype.componentWillUnmount).not.to.have.been.called;
		expect(Inner.prototype.componentDidMount).to.have.been.calledOnce;
		expect(Inner.prototype.render).to.have.been.calledTwice;

		expect(Inner.prototype.render.secondCall)
			.to.have.been.calledWith({ foo:'bar', i:2 })
			.and.to.have.returned(sinon.match({
				attributes: {
					j: 2,
					i: 2,
					foo: 'bar'
				}
			}));

		expect(scratch.innerHTML).to.equal('<div j="2" foo="bar" i="2">inner</div>');

		// update & flush
		doRender();
		rerender();

		expect(Inner.prototype.componentWillUnmount).not.to.have.been.called;
		expect(Inner.prototype.componentDidMount).to.have.been.calledOnce;
		expect(Inner.prototype.render).to.have.been.calledThrice;

		expect(Inner.prototype.render.thirdCall)
			.to.have.been.calledWith({ foo:'bar', i:3 })
			.and.to.have.returned(sinon.match({
				attributes: {
					j: 3,
					i: 3,
					foo: 'bar'
				}
			}));

		expect(scratch.innerHTML).to.equal('<div j="3" foo="bar" i="3">inner</div>');
	});
});
