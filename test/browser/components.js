import { h, render, rerender, Component } from '../../src/preact';
/** @jsx h */

let spyAll = obj => Object.keys(obj).forEach( key => sinon.spy(obj,key) );

describe('Components', () => {
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


	// Test for Issue #73
	it('should remove orphaned elements replaced by Components', () => {
		class Comp extends Component {
			render() {
				return <span>span in a component</span>;
			}
		}

		let root;
		function test(content) {
			root = render(content, scratch, root);
		}

		test(<Comp />);
		test(<div>just a div</div>);
		test(<Comp />);

		expect(scratch.innerHTML).to.equal('<span>span in a component</span>');
	});


	describe('props.children', () => {
		it('should support passing children as a prop', () => {
			const Foo = props => <div {...props} />;

			render(<Foo a="b" children={[
				<span class="bar">bar</span>,
				'123',
				456
			]} />, scratch);

			expect(scratch.innerHTML).to.equal('<div a="b"><span class="bar">bar</span>123456</div>');
		});

		it('should be ignored when explicit children exist', () => {
			const Foo = props => <div {...props}>a</div>;

			render(<Foo children={'b'} />, scratch);

			expect(scratch.innerHTML).to.equal('<div>a</div>');
		});
	});


	describe('High-Order Components', () => {
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
			let doRender = null,
				alt = false;

			class Outer extends Component {
				componentDidMount() {
					let i = 1;
					doRender = () => this.setState({ i: ++i });
				}
				componentWillUnmount() {}
				render(props, { i }) {
					if (alt) return <div />;
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
				componentWillMount() {}
				componentDidMount() {}
				componentWillUnmount() {}
				componentDidUnmount() {}
				render(props) {
					return <div j={ ++j } {...props}>inner</div>;
				}
			}
			sinon.spy(Inner.prototype, '_constructor');
			sinon.spy(Inner.prototype, 'render');
			sinon.spy(Inner.prototype, 'componentWillMount');
			sinon.spy(Inner.prototype, 'componentDidMount');
			sinon.spy(Inner.prototype, 'componentDidUnmount');
			sinon.spy(Inner.prototype, 'componentWillUnmount');

			render(<Outer foo="bar" />, scratch);

			expect(Outer.prototype.componentDidMount).to.have.been.calledOnce;

			// update & flush
			doRender();
			rerender();

			expect(Outer.prototype.componentWillUnmount).not.to.have.been.called;

			expect(Inner.prototype._constructor).to.have.been.calledOnce;
			expect(Inner.prototype.componentWillUnmount).not.to.have.been.called;
			expect(Inner.prototype.componentDidUnmount).not.to.have.been.called;
			expect(Inner.prototype.componentWillMount).to.have.been.calledOnce;
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
			expect(Inner.prototype.componentDidUnmount).not.to.have.been.called;
			expect(Inner.prototype.componentWillMount).to.have.been.calledOnce;
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


			// update & flush
			alt = true;
			doRender();
			rerender();

			expect(Inner.prototype.componentWillUnmount).to.have.been.calledOnce;
			expect(Inner.prototype.componentDidUnmount).to.have.been.calledOnce;
		});

		it('should unmount children of high-order components without unmounting parent', () => {
			let inner, counter=0;

			class Outer extends Component {
				componentWillUnmount(){}
				componentDidUnmount(){}
				componentWillMount(){}
				componentDidMount(){}
				render() {
					return <Inner ref={c=>inner=c} />;
				}
			}
			spyAll(Outer.prototype);

			class Inner extends Component {
				componentWillUnmount(){}
				componentDidUnmount(){}
				componentWillMount(){}
				componentDidMount(){}
				render() {
					return h('element'+(++counter));
				}
			}
			spyAll(Inner.prototype);

			render(<Outer />, scratch);

			console.log(inner);

			// outer should only have been mounted once
			expect(Outer.prototype.componentWillMount).to.have.been.calledOnce;
			expect(Outer.prototype.componentDidMount).to.have.been.calledOnce;
			expect(Outer.prototype.componentWillUnmount).not.to.have.been.called;
			expect(Outer.prototype.componentWillUnmount).not.to.have.been.called;

			// inner should only have been mounted once
			expect(Inner.prototype.componentWillMount).to.have.been.calledOnce;
			expect(Inner.prototype.componentDidMount).to.have.been.calledOnce;
			expect(Inner.prototype.componentWillUnmount).not.to.have.been.called;
			expect(Inner.prototype.componentWillUnmount).not.to.have.been.called;

			inner.forceUpdate();

			expect(Inner.prototype.render).to.have.been.calledTwice;

			// outer should still only have been mounted once
			expect(Outer.prototype.componentWillMount).to.have.been.calledOnce;
			expect(Outer.prototype.componentDidMount).to.have.been.calledOnce;
			expect(Outer.prototype.componentWillUnmount).not.to.have.been.called;
			expect(Outer.prototype.componentWillUnmount).not.to.have.been.called;

			// inner should only have been mounted once
			expect(Inner.prototype.componentWillMount).to.have.been.calledTwice;
			expect(Inner.prototype.componentDidMount).to.have.been.calledTwice;
			expect(Inner.prototype.componentWillUnmount).to.have.been.calledOnce;
			expect(Inner.prototype.componentWillUnmount).to.have.been.calledOnce;
		});
	});
});
