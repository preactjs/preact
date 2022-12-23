import render from '../src';
import renderToStringPretty from '../src/pretty';
import renderToStringJSX from '../src/jsx';
import { h, Component, createContext, Fragment, options } from 'preact';
import { useState, useContext, useEffect, useLayoutEffect } from 'preact/hooks';
import { expect } from 'chai';
import { spy, stub, match } from 'sinon';
import './setup';

function shallowRender(vnode) {
	return renderToStringJSX(vnode, context, {
		jsx: false,
		xml: false,
		pretty: '  ',
		shallow: true
	});
}

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
				for (let i = 0; i < 1000; i++) {
					children.push(
						Math.random() > 0.5 ? String(i) : h('x-' + String(i), null, i)
					);
				}
				let rendered = render(
					<div class="foo">
						x<a>a</a>
						<b>b</b>c{children}d
					</div>
				);

				expect(rendered).not.to.contain(/\s/);
			});

			it('should not indent when attributes contain newlines', () => {
				let rendered = render(
					<div class={`foo\n\tbar\n\tbaz`}>
						<a>a</a>
						<b>b</b>c
					</div>
				);

				expect(rendered).to.equal(
					`<div class="foo\n\tbar\n\tbaz"><a>a</a><b>b</b>c</div>`
				);
			});
		});

		it('should omit falsey attributes', () => {
			let rendered = render(<div a={null} b={undefined} c={false} />),
				expected = `<div></div>`;

			expect(rendered).to.equal(expected);

			expect(render(<div foo={0} />)).to.equal(`<div foo="0"></div>`);
		});

		it('should omit key attribute', () => {
			let rendered = render(<div key="test" />),
				expected = `<div></div>`;

			expect(rendered).to.equal(expected);
		});

		it('should omit ref attribute', () => {
			let rendered = render(<div ref="test" />),
				expected = `<div></div>`;

			expect(rendered).to.equal(expected);
		});

		it('should omit __source attribute', () => {
			let rendered = render(<div __source="test" />),
				expected = `<div></div>`;

			expect(rendered).to.equal(expected);
		});

		it('should omit __self attribute', () => {
			let rendered = render(<div __self="test" />),
				expected = `<div></div>`;

			expect(rendered).to.equal(expected);
		});

		it('should serialize defaultValue props to the value attribute', () => {
			let rendered = render(<div defaultValue="test" />),
				expected = `<div value="test"></div>`;

			expect(rendered).to.equal(expected);
		});

		it('should include boolean aria-* attributes', () => {
			let rendered = render(<div aria-hidden aria-whatever={false} />),
				expected = `<div aria-hidden="true" aria-whatever="false"></div>`;

			expect(rendered).to.equal(expected);
		});

		describe('attribute name sanitization', () => {
			it('should omit attributes with invalid names', () => {
				let rendered = render(
					h('div', {
						'<a': '1',
						'a>': '1',
						'foo"bar': '1',
						'"hello"': '1'
					})
				);
				expect(rendered).to.equal(`<div></div>`);
			});

			it('should mitigate attribute name injection', () => {
				let rendered = render(
					h('div', {
						'></div><script>alert("hi")</script>': '',
						'foo onclick': 'javascript:alert()',
						a: 'b'
					})
				);
				expect(rendered).to.equal(`<div a="b"></div>`);
			});

			it('should allow emoji attribute names', () => {
				let rendered = render(
					h('div', {
						'a;b': '1',
						'a🧙‍b': '1'
					})
				);
				expect(rendered).to.equal(`<div a;b="1" a🧙‍b="1"></div>`);
			});
		});

		it('should throw for invalid nodeName values', () => {
			expect(() => render(h('div'))).not.to.throw();
			expect(() => render(h('x-💩'))).not.to.throw();
			expect(() => render(h('a b'))).to.throw(/<a b>/);
			expect(() => render(h('a\0b'))).to.throw(/<a\0b>/);
			expect(() => render(h('a>'))).to.throw(/<a>>/);
			expect(() => render(h('<'))).to.throw(/<<>/);
			expect(() => render(h('"'))).to.throw(/<">/);
		});

		it('should collapse collapsible attributes', () => {
			let rendered = render(<div class="" style="" foo bar />),
				expected = `<div class style foo bar></div>`;

			expect(rendered).to.equal(expected);
		});

		it('should omit functions', () => {
			let rendered = render(<div a={() => {}} b={function() {}} />),
				expected = `<div></div>`;

			expect(rendered).to.equal(expected);
		});

		it('should encode entities', () => {
			let rendered = render(<div a={'"<>&'}>{'"<>&'}</div>),
				expected = `<div a="&quot;&lt;>&amp;">&quot;&lt;>&amp;</div>`;

			expect(rendered).to.equal(expected);
		});

		it('should serialize textarea value', () => {
			let rendered = render(<textarea value="abc" />),
				expected = `<textarea>abc</textarea>`;

			expect(rendered).to.equal(expected);
		});

		it('should escape textarea value', () => {
			let rendered = render(<textarea value={`a&b"c`} />),
				expected = `<textarea>a&amp;b&quot;c</textarea>`;

			expect(rendered).to.equal(expected);
		});

		it('should omit empty textarea value', () => {
			let rendered = render(<textarea value="" />),
				expected = `<textarea></textarea>`;

			expect(rendered).to.equal(expected);
		});

		it('should omit falsey children', () => {
			let rendered = render(
					<div>
						{null}|{undefined}|{false}
					</div>
				),
				expected = `<div>||</div>`;

			expect(rendered).to.equal(expected);
		});

		it('should self-close void elements', () => {
			let rendered = render(
					<div>
						<input type="text" />
						<wbr />
					</div>
				),
				expected = `<div><input type="text" /><wbr /></div>`;

			expect(rendered).to.equal(expected);
		});

		it('should self-close custom void elements', () => {
			let rendered = renderToStringPretty(
					<div>
						<hello-world />
					</div>,
					null,
					{ voidElements: /^hello-world$/ }
				),
				expected = `<div><hello-world /></div>`;

			expect(rendered).to.equal(expected);
		});

		it('does not close void elements with closing tags', () => {
			let rendered = render(<link>http://preactjs.com</link>),
				expected = `<link>http://preactjs.com</link>`;

			expect(rendered).to.equal(expected);
		});

		it('should not self-close void elements if it has dangerouslySetInnerHTML prop', () => {
			let rendered = render(
					<link dangerouslySetInnerHTML={{ __html: '<foo>' }} />
				),
				expected = `<link><foo></link>`;

			expect(rendered).to.equal(expected);
		});

		it('should serialize object styles', () => {
			let rendered = render(<div style={{ color: 'red', border: 'none' }} />),
				expected = `<div style="color:red;border:none;"></div>`;

			expect(rendered).to.equal(expected);
		});

		it('should preserve CSS Custom Properties', () => {
			let rendered = render(<div style={{ '--foo': 1, '--foo-bar': '2' }} />),
				expected = `<div style="--foo:1;--foo-bar:2;"></div>`;

			expect(rendered).to.equal(expected);
		});

		it('should ignore empty object styles', () => {
			let rendered = render(<div style={{}} />),
				expected = `<div></div>`;

			expect(rendered).to.equal(expected);
		});

		it('should ignore empty css value', () => {
			let rendered = render(<div style={{ color: '' }} />);
			let expected = `<div></div>`;

			expect(rendered).to.equal(expected);
		});

		it('should render SVG elements', () => {
			let rendered = render(
				<svg>
					<image xlinkHref="#" />
					<foreignObject>
						<div xlinkHref="#" />
					</foreignObject>
					<g>
						<image xlinkHref="#" />
					</g>
				</svg>
			);

			expect(rendered).to.equal(
				`<svg><image xlink:href="#"></image><foreignObject><div xlinkHref="#"></div></foreignObject><g><image xlink:href="#"></image></g></svg>`
			);
		});
	});

	describe('Functional Components', () => {
		it('should render functional components', () => {
			let Test = spy(({ foo, children }) => <div foo={foo}>{children}</div>);

			let rendered = render(<Test foo="test">content</Test>);

			expect(rendered).to.equal(`<div foo="test">content</div>`);

			expect(Test).to.have.been.calledOnce.and.calledWithExactly(
				match({
					foo: 'test',
					children: 'content'
				}),
				match({})
			);
		});

		it('should render functional components within JSX', () => {
			let Test = spy(({ foo, children }) => <div foo={foo}>{children}</div>);

			let rendered = render(
				<section>
					<Test foo={1}>
						<span>asdf</span>
					</Test>
				</section>
			);

			expect(rendered).to.equal(
				`<section><div foo="1"><span>asdf</span></div></section>`
			);

			expect(Test).to.have.been.calledOnce.and.calledWithExactly(
				match({
					foo: 1,
					children: match({ type: 'span', props: { children: 'asdf' } })
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

			expect(render(<Test />), 'defaults').to.equal(
				'<div foo="default foo" bar="default bar"></div>'
			);
			expect(render(<Test bar="b" />), 'partial').to.equal(
				'<div bar="b" foo="default foo"></div>'
			);
			expect(render(<Test foo="a" bar="b" />), 'overridden').to.equal(
				'<div foo="a" bar="b"></div>'
			);
			expect(render(<Test foo={undefined} bar="b" />), 'overridden').to.equal(
				'<div foo="default foo" bar="b"></div>'
			);
		});
	});

	describe('Classical Components', () => {
		it('should render classical components', () => {
			let Test = spy(
				class Test extends Component {
					render({ foo, children }, state) {
						return <div foo={foo}>{children}</div>;
					}
				}
			);
			spy(Test.prototype, 'render');

			let rendered = render(<Test foo="test">content</Test>);

			const PROPS = {
				foo: 'test',
				children: 'content'
			};

			expect(rendered).to.equal(`<div foo="test">content</div>`);

			expect(Test).to.have.been.calledOnce.and.calledWith(
				match(PROPS),
				match({})
			);

			expect(
				Test.prototype.render
			).to.have.been.calledOnce.and.calledWithExactly(
				match(PROPS),
				match({}),
				match({}) // empty context
			);
		});

		it('should render classical components within JSX', () => {
			let Test = spy(
				class Test extends Component {
					render({ foo, children }, state) {
						return <div foo={foo}>{children}</div>;
					}
				}
			);

			spy(Test.prototype, 'render');

			let rendered = render(
				<section>
					<Test foo={1}>
						<span>asdf</span>
					</Test>
				</section>
			);

			expect(rendered).to.equal(
				`<section><div foo="1"><span>asdf</span></div></section>`
			);

			expect(Test).to.have.been.calledOnce;

			expect(
				Test.prototype.render
			).to.have.been.calledOnce.and.calledWithExactly(
				match({
					foo: 1,
					children: match({ type: 'span', props: { children: 'asdf' } })
				}),
				match({}),
				match({})
			);
		});

		it('should apply defaultProps', () => {
			class Test extends Component {
				render(props) {
					return <div {...props} />;
				}
			}
			Test.defaultProps = {
				foo: 'default foo',
				bar: 'default bar'
			};

			expect(render(<Test />), 'defaults').to.equal(
				'<div foo="default foo" bar="default bar"></div>'
			);
			expect(render(<Test bar="b" />), 'partial').to.equal(
				'<div bar="b" foo="default foo"></div>'
			);
			expect(render(<Test foo="a" bar="b" />), 'overridden').to.equal(
				'<div foo="a" bar="b"></div>'
			);
			expect(render(<Test foo={undefined} bar="b" />), 'overridden').to.equal(
				'<div foo="default foo" bar="b"></div>'
			);
		});

		it('should initialize state as an empty object', () => {
			const fn = spy();
			class Test extends Component {
				render(state) {
					fn(this.state, state);
					return <div />;
				}
			}

			render(<Test />);
			expect(fn).to.be.calledOnce.and.be.calledWith(match({}), match({}));
		});

		it('should invoke getDerivedStateFromProps', () => {
			class Test extends Component {
				static getDerivedStateFromProps() {
					return { foo: 'bar' };
				}
				render(props, state) {
					return <div {...props} {...state} />;
				}
			}
			spy(Test.prototype.constructor, 'getDerivedStateFromProps');
			spy(Test.prototype, 'render');

			const result = render(<Test />);

			expect(
				Test.prototype.constructor.getDerivedStateFromProps
			).to.have.been.calledOnce.and.to.have.been.calledBefore(
				Test.prototype.render
			);

			expect(result).to.equal('<div foo="bar"></div>');
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

			expect(
				Test.prototype.componentWillMount
			).to.have.been.calledOnce.and.to.have.been.calledBefore(
				Test.prototype.render
			);
		});

		it('should be able to call setState in componentWillMount', () => {
			class Test extends Component {
				constructor(props) {
					super(props);
					this.state = { updated: false };
				}
				componentWillMount() {
					this.setState({ updated: true });
				}
				render() {
					return <p>{this.state.updated.toString()}</p>;
				}
			}

			expect(render(<Test />)).to.equal('<p>true</p>');
		});

		it('should invoke getDerivedStateFromProps rather than componentWillMount', () => {
			class Test extends Component {
				static getDerivedStateFromProps() {}
				componentWillMount() {}
				render(props) {
					return <div {...props} />;
				}
			}
			spy(Test.prototype.constructor, 'getDerivedStateFromProps');
			spy(Test.prototype, 'componentWillMount');
			spy(Test.prototype, 'render');

			render(<Test />);

			expect(
				Test.prototype.constructor.getDerivedStateFromProps
			).to.have.been.calledOnce.and.to.have.been.calledBefore(
				Test.prototype.render
			);
			expect(Test.prototype.componentWillMount).to.not.have.been.called;
		});

		it('should pass context to grandchildren', () => {
			const CONTEXT = { a: 'a' };
			const PROPS = { b: 'b' };

			class Outer extends Component {
				getChildContext() {
					return CONTEXT;
				}
				render(props) {
					return (
						<div>
							<Inner {...props} />
						</div>
					);
				}
			}
			spy(Outer.prototype, 'getChildContext');

			class Inner extends Component {
				render(props, state, context) {
					return <div>{context && context.a}</div>;
				}
			}
			spy(Inner.prototype, 'render');

			render(<Outer />);

			expect(Outer.prototype.getChildContext).to.have.been.calledOnce;
			expect(Inner.prototype.render).to.have.been.calledWith(
				match({}),
				match({}),
				CONTEXT
			);

			CONTEXT.foo = 'bar';
			render(<Outer {...PROPS} />);

			expect(Outer.prototype.getChildContext).to.have.been.calledTwice;
			expect(Inner.prototype.render).to.have.been.calledWith(
				match(PROPS),
				match({}),
				CONTEXT
			);
		});

		it('should pass context to direct children', () => {
			const CONTEXT = { a: 'a' };
			const PROPS = { b: 'b' };

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
					return <div>{context && context.a}</div>;
				}
			}
			spy(Inner.prototype, 'render');

			render(<Outer />);

			expect(Outer.prototype.getChildContext).to.have.been.calledOnce;
			expect(Inner.prototype.render).to.have.been.calledWith(
				match({}),
				match({}),
				CONTEXT
			);

			CONTEXT.foo = 'bar';
			render(<Outer {...PROPS} />);

			expect(Outer.prototype.getChildContext).to.have.been.calledTwice;
			expect(Inner.prototype.render).to.have.been.calledWith(
				match(PROPS),
				match({}),
				CONTEXT
			);

			// make sure render() could make use of context.a
			expect(Inner.prototype.render).to.have.returned(
				match({ props: { children: 'a' } })
			);
		});

		it('should preserve existing context properties when creating child contexts', () => {
			let outerContext = { outer: true },
				innerContext = { inner: true };
			class Outer extends Component {
				getChildContext() {
					return { outerContext };
				}
				render() {
					return (
						<div>
							<Inner />
						</div>
					);
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

			expect(Inner.prototype.render).to.have.been.calledWith(
				match({}),
				match({}),
				{ outerContext }
			);
			expect(InnerMost.prototype.render).to.have.been.calledWith(
				match({}),
				match({}),
				{ outerContext, innerContext }
			);
		});
	});

	describe('High-order components', () => {
		class Outer extends Component {
			render({ children, ...props }) {
				return (
					<Inner {...props} a="b">
						child <span>{children}</span>
					</Inner>
				);
			}
		}

		class Inner extends Component {
			render({ children, ...props }) {
				return (
					<div id="inner" {...props} b="c" c="d">
						{children}
					</div>
				);
			}
		}

		it('should resolve+render high order components', () => {
			let rendered = render(
				<Outer a="a" b="b" p={1}>
					foo
				</Outer>
			);
			expect(rendered).to.equal(
				'<div id="inner" a="b" b="c" p="1" c="d">child <span>foo</span></div>'
			);
		});

		it('should render child inline when shallow=true', () => {
			let rendered = shallowRender(
				<Outer a="a" b="b" p={1}>
					foo
				</Outer>
			);
			expect(rendered).to.equal(
				`<Inner a="b" b="b" p="1">\n  child \n  <span>foo</span>\n</Inner>`
			);
		});

		it('should render nested high order components when shallowHighOrder=false', () => {
			// using functions for meaningful generation of displayName
			function Outer() {
				return <Middle />;
			}
			function Middle() {
				return (
					<div>
						<Inner />
					</div>
				);
			}
			function Inner() {
				return 'hi';
			}

			let rendered = render(<Outer />);
			expect(rendered).to.equal('<div>hi</div>');

			rendered = renderToStringPretty(<Outer />, null, { shallow: true });
			expect(rendered, '{shallow:true}').to.equal('<Middle></Middle>');

			rendered = renderToStringPretty(<Outer />, null, {
				shallow: true,
				shallowHighOrder: false
			});
			expect(rendered, '{shallow:true,shallowHighOrder:false}').to.equal(
				'<div><Inner></Inner></div>',
				'but it should never render nested grandchild components'
			);
		});
	});

	describe('dangerouslySetInnerHTML', () => {
		it('should support dangerouslySetInnerHTML', () => {
			// some invalid HTML to make sure we're being flakey:
			let html = '<a href="foo">asdf</a> some text <ul><li>foo<li>bar</ul>';
			let rendered = render(
				<div id="f" dangerouslySetInnerHTML={{ __html: html }} />
			);
			expect(rendered).to.equal(`<div id="f">${html}</div>`);
		});

		it('should override children', () => {
			let rendered = render(
				<div dangerouslySetInnerHTML={{ __html: 'foo' }}>
					<b>bar</b>
				</div>
			);
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

		// FIXME
		it.skip('should prefer class over className', () => {
			let rendered = render(<div class="foo" className="foo bar" />);
			expect(rendered).to.equal('<div class="foo"></div>');
		});
	});

	describe('htmlFor / for massaging', () => {
		it('should render for using htmlFor', () => {
			let rendered = render(<label htmlFor="foo" />);
			expect(rendered).to.equal('<label for="foo"></label>');
		});

		it('should render for using for', () => {
			let rendered = render(<label for="foo" />);
			expect(rendered).to.equal('<label for="foo"></label>');
		});

		it('should prefer for over htmlFor', () => {
			let rendered = render(<label for="foo" htmlFor="bar" />);
			expect(rendered).to.equal('<label for="foo"></label>');
		});
	});

	describe('sortAttributes', () => {
		it('should leave attributes unsorted by default', () => {
			let rendered = render(<div b1="b1" c="c" a="a" b="b" />);
			expect(rendered).to.equal('<div b1="b1" c="c" a="a" b="b"></div>');
		});

		it('should sort attributes lexicographically if enabled', () => {
			let rendered = renderToStringPretty(
				<div b1="b1" c="c" a="a" b="b" />,
				null,
				{
					sortAttributes: true
				}
			);
			expect(rendered).to.equal('<div a="a" b="b" b1="b1" c="c"></div>');
		});
	});

	describe('xml:true', () => {
		let renderXml = jsx => renderToStringPretty(jsx, null, { xml: true });

		it('should render end-tags', () => {
			expect(renderXml(<div />)).to.equal(`<div />`);
			expect(renderXml(<a />)).to.equal(`<a />`);
			expect(renderXml(<a>b</a>)).to.equal(`<a>b</a>`);
		});

		it('should not self-close if it has dangerouslySetInnerHTML prop', () => {
			expect(
				renderXml(<a dangerouslySetInnerHTML={{ __html: 'b' }} />)
			).to.equal(`<a>b</a>`);
			expect(
				renderXml(<a dangerouslySetInnerHTML={{ __html: '<b />' }} />)
			).to.equal(`<a><b /></a>`);
		});

		it('should render boolean attributes with named values', () => {
			expect(renderXml(<div foo bar />)).to.equal(
				`<div foo="foo" bar="bar" />`
			);
		});

		it('should exclude falsey attributes', () => {
			expect(renderXml(<div foo={false} bar={0} />)).to.equal(
				`<div bar="0" />`
			);
		});
	});

	describe('state locking', () => {
		// TODO: we use flags now
		it.skip('should set _dirty to true', () => {
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
			expect(inst).to.have.property('_dirty', true);
		});

		it('should prevent re-rendering', () => {
			const Bar = stub().returns(<div />);

			let count = 0;

			class Foo extends Component {
				componentDidMount() {
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

	describe('Fragments', () => {
		it('should skip Fragment node', () => {
			let html = render(
				<div>
					<Fragment>foo</Fragment>
				</div>
			);
			expect(html).to.equal('<div>foo</div>');
		});

		it('should skip Fragment node with multiple children', () => {
			let html = render(
				<div>
					<Fragment>
						foo
						<span>bar</span>
					</Fragment>
				</div>
			);
			expect(html).to.equal('<div>foo<span>bar</span></div>');
		});

		it('should skip Fragment node with multiple children #2', () => {
			let html = render(
				<div>
					<Fragment>
						<div>foo</div>
						<div>bar</div>
					</Fragment>
				</div>
			);
			expect(html).to.equal('<div><div>foo</div><div>bar</div></div>');
		});

		it('should indent Fragment children when pretty printing', () => {
			let html = renderToStringPretty(
				<div>
					<Fragment>
						<div>foo</div>
						<div>bar</div>
						<div>
							<div>baz</div>
							<div>quux</div>
						</div>
					</Fragment>
				</div>,
				undefined,
				{ pretty: true }
			);
			expect(html).to.equal(
				'<div>\n\t<div>foo</div>\n\t<div>bar</div>\n\t<div>\n\t\t<div>baz</div>\n\t\t<div>quux</div>\n\t</div>\n</div>'
			);
		});

		it('should skip Fragment even if it has props', () => {
			let html = render(
				<div>
					<Fragment key="2">foo</Fragment>
				</div>
			);
			expect(html).to.equal('<div>foo</div>');
		});

		it('should skip sibling Fragments', () => {
			let html = render(
				<div>
					<Fragment>foo</Fragment>
					<Fragment>bar</Fragment>
				</div>
			);
			expect(html).to.equal('<div>foobar</div>');
		});

		it('should skip nested Fragments', () => {
			let html = render(
				<div>
					<Fragment>
						<Fragment>foo</Fragment>
					</Fragment>
				</div>
			);
			expect(html).to.equal('<div>foo</div>');
		});
	});

	describe('hooks', () => {
		it('should not crash with hooks', () => {
			function Foo() {
				let [v, setter] = useState(0);
				return <button onClick={() => setter(++v)}>count: {v}</button>;
			}

			// eslint-disable-next-line prefer-arrow-callback
			expect(function() {
				render(<Foo />);
			}).to.not.throw();
		});

		it('should not crash with effectful hooks', () => {
			function Foo() {
				useEffect(() => {
					// Nothing
				}, []);

				useLayoutEffect(() => {
					// Nothing
				}, []);

				return <div />;
			}

			// eslint-disable-next-line prefer-arrow-callback
			expect(function() {
				render(<Foo />);
			}).to.not.throw();
		});

		it('should work with useContext and default value', () => {
			let Ctx = createContext('foo');
			function Foo() {
				let v = useContext(Ctx);
				return <div>{v}</div>;
			}

			let res = render(<Foo />);

			expect(res).to.equal('<div>foo</div>');
		});

		it('should work with useContext + custom value', () => {
			let Ctx = createContext('foo');
			function Foo() {
				let v = useContext(Ctx);
				return <div>{v}</div>;
			}

			let res = render(
				<Ctx.Provider value="bar">
					<Foo />
				</Ctx.Provider>
			);

			expect(res).to.equal('<div>bar</div>');
		});

		it('should work with useContext + custom value with multiple children', () => {
			let Ctx = createContext('foo');
			function Foo() {
				let v = useContext(Ctx);
				return <div>{v}</div>;
			}

			let res = render(
				<Ctx.Provider value="bar">
					<Foo />
					<Foo />
				</Ctx.Provider>
			);

			expect(res).to.equal('<div>bar</div><div>bar</div>');
		});

		it('should work with useState', () => {
			function Foo() {
				let [v] = useState(0);
				return <div>{v}</div>;
			}

			expect(render(<Foo />)).to.equal('<div>0</div>');
		});

		it('should not trigger useEffect callbacks', () => {
			let called = false;
			function Foo() {
				useEffect(() => (called = true));
				return <div />;
			}

			render(<Foo />);
			expect(called).to.equal(false);
		});
	});

	// We call these with internals now
	it.skip('should invoke option hooks', () => {
		const calls = [];
		// _diff
		const oldDiff = options.__b;
		options.__b = (...args) => {
			calls.push(['_diff', args]);
			if (oldDiff) oldDiff(...args);
		};
		// _render
		const oldRender = options.__r;
		options.__r = (...args) => {
			calls.push(['_render', args]);
			if (oldRender) oldRender(...args);
		};
		const oldDiffed = options.diffed;
		options.diffed = (...args) => {
			calls.push(['diffed', args]);
			if (oldDiffed) oldDiffed(...args);
		};
		// _commit
		const oldCommit = options.__c;
		options.__c = (...args) => {
			calls.push(['_commit', args]);
			if (oldCommit) oldCommit(...args);
		};

		function Component1({ children }) {
			return children;
		}

		function Component2() {
			return <div />;
		}

		const vnode2 = <Component2>1</Component2>;
		const vnode1 = <Component1>{vnode2}</Component1>;

		render(vnode1);

		expect(calls).to.deep.equal([
			['_diff', [vnode1]],
			['_render', [vnode1]],
			['diffed', [vnode1]],
			['_diff', [vnode2]],
			['_render', [vnode2]],
			['diffed', [vnode2]],
			['_commit', [vnode1, []]]
		]);

		expect(calls.length).to.equal(7);

		options.__b = oldDiff;
		options.__r = oldRender;
	});

	it('should render select value on option', () => {
		let res = render(
			<select value="B">
				<option value="A">A</option>
				<option value="B">B</option>
			</select>
		);
		expect(res).to.equal(
			'<select><option value="A">A</option><option selected value="B">B</option></select>'
		);
	});

	it('should render select value on option with a Fragment', () => {
		let res = render(
			<select value="B">
				<Fragment>
					<option value="A">A</option>
					<option value="B">B</option>
				</Fragment>
			</select>
		);
		expect(res).to.equal(
			'<select><option value="A">A</option><option selected value="B">B</option></select>'
		);
	});

	it('should render select value on option through a component', () => {
		function Foo() {
			return (
				<optgroup label="foo">
					<option value="A">A</option>
					<option value="B">B</option>
				</optgroup>
			);
		}
		let res = render(
			<select value="B">
				<Foo />
			</select>
		);
		expect(res).to.equal(
			'<select><optgroup label="foo"><option value="A">A</option><option selected value="B">B</option></optgroup></select>'
		);
	});

	it('should render select value with loose equality', () => {
		let res = render(
			<select value={2}>
				<option value="2">2</option>
			</select>
		);
		expect(res).to.equal(
			'<select><option selected value="2">2</option></select>'
		);
	});
});
