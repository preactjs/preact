import { render, shallowRender } from '../src';
import { h, Component } from 'preact';
import chai, { expect } from 'chai';
import { spy, stub, match } from 'sinon';
import sinonChai from 'sinon-chai';
chai.use(sinonChai);

describe('render', () => {
	describe('Basic JSX', () => {
		it('should render JSX', () => {
			let rendered = render(<div class="foo">bar</div>),
				expected = `<div class="foo">bar</div>`;

			expect(rendered).to.equal(expected);
		});

		describe('whitespace', () => {
			it('should omit whitespace between elements', () => {
				let children = [];
				for (let i=0; i<1000; i++) {
					children.push(Math.random()>.5 ? String(i) : h('x-'+String(i), null, i));
				}
				let rendered = render(
					<div class="foo">
						x
						<a>a</a>
						<b>b</b>
						c
						{children}
						d
					</div>
				);

				expect(rendered).not.to.contain(/\s/);
			});

			it('should not indent when attributes contain newlines', () => {
				let rendered = render(
					<div class={`foo\n\tbar\n\tbaz`}>
						<a>a</a>
						<b>b</b>
						c
					</div>
				);

				expect(rendered).to.equal(`<div class="foo\n\tbar\n\tbaz"><a>a</a><b>b</b>c</div>`);
			});
		});

		it('should omit falsey attributes', () => {
			let rendered = render(<div a={null} b={undefined} c={false} />),
				expected = `<div></div>`;

			expect(rendered).to.equal(expected);

			expect(render(<div foo={0} />)).to.equal(`<div foo="0"></div>`);
		});

		it('should collapse collapsible attributes', () => {
			let rendered = render(<div class="" style="" foo={true} bar />),
				expected = `<div class style foo bar></div>`;

			expect(rendered).to.equal(expected);
		});

		it('should omit functions', () => {
			let rendered = render(<div a={()=>{}} b={function(){}} />),
				expected = `<div></div>`;

			expect(rendered).to.equal(expected);
		});

		it('should encode entities', () => {
			let rendered = render(<div a={'"<>&'}>{'"<>&'}</div>),
				expected = `<div a="&quot;&lt;&gt;&amp;">&quot;&lt;&gt;&amp;</div>`;

			expect(rendered).to.equal(expected);
		});

		it('should omit falsey children', () => {
			let rendered = render(<div>{null}|{undefined}|{false}</div>),
				expected = `<div>||</div>`;

			expect(rendered).to.equal(expected);
		});

		it('should self-close void elements', () => {
			let rendered = render(<div><input type='text' /><wbr /></div>),
				expected = `<div><input type="text" /><wbr /></div>`;

			expect(rendered).to.equal(expected);
		});

		it('does not close void elements with closing tags', () => {
			let rendered = render(<input><p>Hello World</p></input>),
				expected = `<input /><p>Hello World</p>`;

			expect(rendered).to.equal(expected);
		});

		it('should serialize object styles', () => {
			let rendered = render(<div style={{ color:'red', border:'none' }} />),
				expected = `<div style="color: red; border: none;"></div>`;

			expect(rendered).to.equal(expected);
		});

		it('should ignore empty object styles', () => {
			let rendered = render(<div style={{}} />),
				expected = `<div></div>`;

			expect(rendered).to.equal(expected);
		});

		it('should render SVG elements', () => {
			let rendered = render((
				<svg>
					<image xlinkHref="#" />
					<foreignObject>
						<div xlinkHref="#" />
					</foreignObject>
					<g>
						<image xlinkHref="#" />
					</g>
				</svg>
			));

			expect(rendered).to.equal(`<svg><image xlink:href="#"></image><foreignObject><div xlinkHref="#"></div></foreignObject><g><image xlink:href="#"></image></g></svg>`);
		});
	});

	describe('Functional Components', () => {
		it('should render functional components', () => {
			let Test = spy( ({ foo, children }) => <div foo={foo}>{ children }</div> );

			let rendered = render(<Test foo="test">content</Test>);

			expect(rendered)
				.to.equal(`<div foo="test">content</div>`);

			expect(Test)
				.to.have.been.calledOnce
				.and.calledWithExactly(
					match({
						foo: 'test',
						children: ['content']
					}),
					match({})
				);
		});

		it('should render functional components within JSX', () => {
			let Test = spy( ({ foo, children }) => <div foo={foo}>{ children }</div> );

			let rendered = render(
				<section>
					<Test foo={1}><span>asdf</span></Test>
				</section>
			);

			expect(rendered)
				.to.equal(`<section><div foo="1"><span>asdf</span></div></section>`);

			expect(Test)
				.to.have.been.calledOnce
				.and.calledWithExactly(
					match({
						foo: 1,
						children: [
							match({ nodeName:'span', children:['asdf'] })
						]
					}),
					match({})
				);
		});

		it('should apply defaultProps', () => {
			const Test = props => <div {...props} />;
			Test.defaultProps = {
				foo: 'default foo',
				bar: 'default bar'
			};

			expect(render(<Test />), 'defaults').to.equal('<div foo="default foo" bar="default bar"></div>');
			expect(render(<Test bar="b" />), 'partial').to.equal('<div foo="default foo" bar="b"></div>');
			expect(render(<Test foo="a" bar="b" />), 'overridden').to.equal('<div foo="a" bar="b"></div>');
		});
	});

	describe('Classical Components', () => {
		it('should render classical components', () => {
			let Test = spy(class Test extends Component {
				render({ foo, children }, state) {
					return <div foo={foo}>{ children }</div>;
				}
			});
			spy(Test.prototype, 'render');

			let rendered = render(<Test foo="test">content</Test>);

			const PROPS = {
				foo: 'test',
				children: ['content']
			};

			expect(rendered)
				.to.equal(`<div foo="test">content</div>`);

			expect(Test)
				.to.have.been.calledOnce
				.and.calledWith(match(PROPS), match({}));

			expect(Test.prototype.render)
				.to.have.been.calledOnce
				.and.calledWithExactly(
					match(PROPS),
					match({}),	// empty state
					match({})	// empty context
				);
		});

		it('should render classical components within JSX', () => {
			let Test = spy(class Test extends Component {
				render({ foo, children }, state) {
					return <div foo={foo}>{ children }</div>;
				}
			});

			spy(Test.prototype, 'render');

			let rendered = render(
				<section>
					<Test foo={1}><span>asdf</span></Test>
				</section>
			);

			expect(rendered)
				.to.equal(`<section><div foo="1"><span>asdf</span></div></section>`);

			expect(Test).to.have.been.calledOnce;

			expect(Test.prototype.render)
				.to.have.been.calledOnce
				.and.calledWithExactly(
					match({
						foo: 1,
						children: [
							match({ nodeName:'span', children:['asdf'] })
						]
					}),
					match({}),	// empty state
					match({})
				);
		});

		it('should apply defaultProps', () => {
			class Test extends Component {
				static defaultProps = {
					foo: 'default foo',
					bar: 'default bar'
				};
				render(props) {
					return <div {...props} />;
				}
			}

			expect(render(<Test />), 'defaults').to.equal('<div foo="default foo" bar="default bar"></div>');
			expect(render(<Test bar="b" />), 'partial').to.equal('<div foo="default foo" bar="b"></div>');
			expect(render(<Test foo="a" bar="b" />), 'overridden').to.equal('<div foo="a" bar="b"></div>');
		});

		it('should invoke componentWillMount', () => {
			class Test extends Component {
				componentWillMount() {}
				render(props) {
					return <div {...props} />;
				}
			}
			spy(Test.prototype, 'componentWillMount');
			spy(Test.prototype, 'render');

			render(<Test />);

			expect(Test.prototype.componentWillMount)
				.to.have.been.calledOnce
				.and.to.have.been.calledBefore(Test.prototype.render);
		});

		it('should pass context to grandchildren', () => {
			const CONTEXT = { a:'a' };
			const PROPS = { b:'b' };

			class Outer extends Component {
				getChildContext() {
					return CONTEXT;
				}
				render(props) {
					return <div><Inner {...props} /></div>;
				}
			}
			spy(Outer.prototype, 'getChildContext');

			class Inner extends Component {
				render(props, state, context) {
					return <div>{ context && context.a }</div>;
				}
			}
			spy(Inner.prototype, 'render');

			render(<Outer />);

			expect(Outer.prototype.getChildContext).to.have.been.calledOnce;
			expect(Inner.prototype.render).to.have.been.calledWith(match({}), {}, CONTEXT);

			CONTEXT.foo = 'bar';
			render(<Outer {...PROPS} />);

			expect(Outer.prototype.getChildContext).to.have.been.calledTwice;
			expect(Inner.prototype.render).to.have.been.calledWith(match(PROPS), {}, CONTEXT);
		});

		it('should pass context to direct children', () => {
			const CONTEXT = { a:'a' };
			const PROPS = { b:'b' };

			class Outer extends Component {
				getChildContext() {
					return CONTEXT;
				}
				render(props) {
					return <Inner {...props} />;
				}
			}
			spy(Outer.prototype, 'getChildContext');

			class Inner extends Component {
				render(props, state, context) {
					return <div>{ context && context.a }</div>;
				}
			}
			spy(Inner.prototype, 'render');

			render(<Outer />);

			expect(Outer.prototype.getChildContext).to.have.been.calledOnce;
			expect(Inner.prototype.render).to.have.been.calledWith(match({}), {}, CONTEXT);

			CONTEXT.foo = 'bar';
			render(<Outer {...PROPS} />);

			expect(Outer.prototype.getChildContext).to.have.been.calledTwice;
			expect(Inner.prototype.render).to.have.been.calledWith(match(PROPS), {}, CONTEXT);

			// make sure render() could make use of context.a
			expect(Inner.prototype.render).to.have.returned(match({ children:['a'] }));
		});

		it('should preserve existing context properties when creating child contexts', () => {
			let outerContext = { outer:true },
				innerContext = { inner:true };
			class Outer extends Component {
				getChildContext() {
					return { outerContext };
				}
				render() {
					return <div><Inner /></div>;
				}
			}

			class Inner extends Component {
				getChildContext() {
					return { innerContext };
				}
				render() {
					return <InnerMost />;
				}
			}

			class InnerMost extends Component {
				render() {
					return <strong>test</strong>;
				}
			}

			spy(Inner.prototype, 'render');
			spy(InnerMost.prototype, 'render');

			render(<Outer />);

			expect(Inner.prototype.render).to.have.been.calledWith(match({}), {}, { outerContext });
			expect(InnerMost.prototype.render).to.have.been.calledWith(match({}), {}, { outerContext, innerContext });
		});
	});

	describe('High-order components', () => {
		class Outer extends Component {
			render({ children, ...props }) {
				return <Inner {...props} a="b">child <span>{ children }</span></Inner>;
			}
		}

		class Inner extends Component {
			render({ children, ...props }) {
				return <div id="inner" {...props} b="c" c="d">{ children }</div>;
			}
		}

		it('should resolve+render high order components', () => {
			let rendered = render(<Outer a="a" b="b" p={1}>foo</Outer>);
			expect(rendered).to.equal('<div id="inner" a="b" b="c" p="1" c="d">child <span>foo</span></div>');
		});

		it('should render child inline when shallow=true', () => {
			let rendered = shallowRender(<Outer a="a" b="b" p={1}>foo</Outer>);
			expect(rendered).to.equal('<Inner a="b" b="b" p="1">child <span>foo</span></Inner>');
		});

		it('should render nested high order components when shallowHighOrder=false', () => {
			// using functions for meaningful generation of displayName
			function Outer() { return <Middle />; }
			function Middle() { return <div><Inner /></div>; }
			function Inner() { return 'hi'; }

			let rendered = render(<Outer />);
			expect(rendered).to.equal('<div>hi</div>');

			rendered = render(<Outer />, null, { shallow:true });
			expect(rendered, '{shallow:true}').to.equal('<Middle></Middle>');

			rendered = render(<Outer />, null, { shallow:true, shallowHighOrder:false });
			expect(rendered, '{shallow:true,shallowHighOrder:false}').to.equal('<div><Inner></Inner></div>', 'but it should never render nested grandchild components');
		});
	});

	describe('dangerouslySetInnerHTML', () => {
		it('should support dangerouslySetInnerHTML', () => {
			// some invalid HTML to make sure we're being flakey:
			let html = '<a href="foo">asdf</a> some text <ul><li>foo<li>bar</ul>';
			let rendered = render(<div id="f" dangerouslySetInnerHTML={{__html:html}} />);
			expect(rendered).to.equal(`<div id="f">${html}</div>`);
		});

		it('should override children', () => {
			let rendered = render(<div dangerouslySetInnerHTML={{__html:'foo'}}><b>bar</b></div>);
			expect(rendered).to.equal('<div>foo</div>');
		});
	});

	describe('className / class massaging', () => {
		it('should render class using className', () => {
			let rendered = render(<div className="foo bar" />);
			expect(rendered).to.equal('<div class="foo bar"></div>');
		});

		it('should render class using class', () => {
			let rendered = render(<div class="foo bar" />);
			expect(rendered).to.equal('<div class="foo bar"></div>');
		});

		it('should prefer class over className', () => {
			let rendered = render(<div class="foo" className="foo bar" />);
			expect(rendered).to.equal('<div class="foo"></div>');
		});

		it('should stringify object classNames', () => {
			let rendered = render(<div class={{ foo:1, bar:0, baz:true, buzz:false }} />);
			expect(rendered, 'class').to.equal('<div class="foo baz"></div>');

			rendered = render(<div className={{ foo:1, bar:0, baz:true, buzz:false }} />);
			expect(rendered, 'className').to.equal('<div class="foo baz"></div>');
		});
	});

	describe('sortAttributes', () => {
		it('should leave attributes unsorted by default', () => {
			let rendered = render(<div b1="b1" c="c" a="a" b="b" />);
			expect(rendered).to.equal('<div b1="b1" c="c" a="a" b="b"></div>');
		});

		it('should sort attributes lexicographically if enabled', () => {
			let rendered = render(<div b1="b1" c="c" a="a" b="b" />, null, { sortAttributes:true });
			expect(rendered).to.equal('<div a="a" b="b" b1="b1" c="c"></div>');
		});
	});

	describe('xml:true', () => {
		let renderXml = jsx => render(jsx, null, { xml:true });

		it('should render end-tags', () => {
			expect(renderXml(<div />)).to.equal(`<div />`);
			expect(renderXml(<a />)).to.equal(`<a />`);
			expect(renderXml(<a>b</a>)).to.equal(`<a>b</a>`);
		});

		it('should render boolean attributes with named values', () => {
			expect(renderXml(<div foo bar />)).to.equal(`<div foo="foo" bar="bar" />`);
		});

		it('should exclude falsey attributes', () => {
			expect(renderXml(<div foo={false} bar={0} />)).to.equal(`<div bar="0" />`);
		});
	});
	
	describe('state locking', () => {
		it('should set _disable and __x to true', () => {
			let inst;
			class Foo extends Component {
				constructor(props, context) {
					super(props, context);
					inst = this;
				}
				render() {
					return <div />;
				}
			}
			
			expect(render(<Foo />)).to.equal('<div></div>');
			
			expect(inst).to.have.property('_disable', true);
			expect(inst).to.have.property('__x', true);
		});

		it('should prevent re-rendering', () => {
			const Bar = stub().returns(<div />);

			let count = 0;

			class Foo extends Component {
				componentWillMount() {
					this.forceUpdate();
				}
				render() {
					return <Bar count={++count} />;
				}
			}
			
			expect(render(<Foo />)).to.equal('<div></div>');
			
			expect(Bar).to.have.been.calledOnce.and.calledWithMatch({ count: 1 });
		});
	});
});
