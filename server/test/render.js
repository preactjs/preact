import { render, shallowRender } from '../src';
import { h, Component } from 'preact';
import chai, { expect } from 'chai';
import { spy, match } from 'sinon';
import sinonChai from 'sinon-chai';
chai.use(sinonChai);

describe('render', () => {
	describe('Basic JSX', () => {
		it('should render JSX', () => {
			let rendered = render(<div class="foo">bar</div>),
				expected = `<div class="foo">bar</div>`;

			expect(rendered).to.equal(expected);
		});

		it('should omit falsey attributes', () => {
			let rendered = render(<div a={null} b={undefined} c={false} />),
				expected = `<div></div>`;

			expect(rendered).to.equal(expected);

			expect(render(<div foo={0} />)).to.equal(`<div foo="0"></div>`);
		});

		it('should collapse collapsible attributes', () => {
			let rendered = render(<div class="" style="" foo={true} bar />),
				expected = `<div foo bar></div>`;

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

		it('does not close void elements', () => {
			let rendered, expected;

			rendered = render(<div><input type='text' /><wbr /></div>);
			expected = `<div><input type="text"><wbr></div>`;

			expect(rendered).to.equal(expected);

			rendered = render(<input><p>Hello World</p></input>);
			expected = `<input><p>Hello World</p>`;

			expect(rendered).to.equal(expected);
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

		it('should prefer className over class', () => {
			let rendered = render(<div class="foo" className="foo bar" />);
			expect(rendered).to.equal('<div class="foo bar"></div>');
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
});
