import { render, shallowRender } from '../src';
import { h, Component } from 'preact';
import { expect, use } from 'chai';
import { spy, match } from 'sinon';
import sinonChai from 'sinon-chai';
use(sinonChai);

describe('render', () => {
	describe('Basic JSX', () => {
		it('should render JSX', () => {
			let rendered = render(<div class="foo">bar</div>),
				expected = `<div class="foo">bar</div>`;

			expect(rendered).to.equal(expected);
		});

		it('should omit null and undefined attributes', () => {
			let rendered = render(<div a={null} b={undefined} />),
				expected = `<div></div>`;

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
	});

	describe('Classical Components', () => {
		it('should render classical components', () => {
			class Test extends Component {
				render({ foo, children }, state) {
					return <div foo={foo}>{ children }</div>;
				}
			}

			Test = spy(Test);
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
			class Test extends Component {
				render({ foo, children }, state) {
					return <div foo={foo}>{ children }</div>;
				}
			}

			Test = spy(Test);
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
			const Outer = () => <Middle />;
			const Middle = () => <div><Inner /></div>;
			const Inner = () => 'hi';

			let rendered = render(<Outer />);
			expect(rendered).to.equal('<div>hi</div>');

			rendered = render(<Outer />, null, { shallow:true });
			expect(rendered).to.equal('<Middle></Middle>');

			rendered = render(<Outer />, null, { shallow:true, shallowHighOrder:false });
			expect(rendered).to.equal('<div><Inner></Inner></div>', 'but it should never render nested grandchild components');
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
});
