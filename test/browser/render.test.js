/* global DISABLE_FLAKEY */

import { setupRerender } from 'preact/test-utils';
import { createElement, render, Component, options } from 'preact';
import {
	setupScratch,
	teardown,
	getMixedArray,
	mixedArrayHTML,
	sortCss,
	serializeHtml,
	supportsPassiveEvents,
	supportsDataList
} from '../_util/helpers';
import { clearLog, getLog, logCall } from '../_util/logCall';

/** @jsx createElement */

function getAttributes(node) {
	let attrs = {};
	for (let i = node.attributes.length; i--; ) {
		attrs[node.attributes[i].name] = node.attributes[i].value;
	}
	return attrs;
}

// hacky normalization of attribute order across browsers.
function sortAttributes(html) {
	return html.replace(
		/<([a-z0-9-]+)((?:\s[a-z0-9:_.-]+=".*?")+)((?:\s*\/)?>)/gi,
		(s, pre, attrs, after) => {
			let list = attrs
				.match(/\s[a-z0-9:_.-]+=".*?"/gi)
				.sort((a, b) => (a > b ? 1 : -1));
			if (~after.indexOf('/')) after = '></' + pre + '>';
			return '<' + pre + list.join('') + after;
		}
	);
}

describe('render()', () => {
	let scratch, rerender;

	beforeEach(() => {
		scratch = setupScratch();
		rerender = setupRerender();
	});

	afterEach(() => {
		teardown(scratch);
	});

	before(() => {
		logCall(Element.prototype, 'appendChild');
		logCall(Element.prototype, 'insertBefore');
		logCall(Element.prototype, 'removeChild');
		logCall(Element.prototype, 'remove');
	});

	it('should render an empty text node given an empty string', () => {
		render('', scratch);
		let c = scratch.childNodes;
		expect(c).to.have.length(1);
		expect(c[0].data).to.equal('');
		expect(c[0].nodeName).to.equal('#text');
	});

	it('should allow node type change with content', () => {
		render(<span>Bad</span>, scratch);
		render(<div>Good</div>, scratch);
		expect(scratch.innerHTML).to.eql(`<div>Good</div>`);
	});

	it('should not render when detecting JSON-injection', () => {
		const vnode = JSON.parse('{"type":"span","children":"Malicious"}');
		render(vnode, scratch);
		expect(scratch.firstChild).to.be.null;
	});

	it('should create empty nodes (<* />)', () => {
		render(<div />, scratch);
		expect(scratch.childNodes).to.have.length(1);
		expect(scratch.childNodes[0].nodeName).to.equal('DIV');

		scratch.parentNode.removeChild(scratch);
		scratch = document.createElement('div');
		(document.body || document.documentElement).appendChild(scratch);

		render(<span />, scratch);
		expect(scratch.childNodes).to.have.length(1);
		expect(scratch.childNodes[0].nodeName).to.equal('SPAN');
	});

	it('should support custom tag names', () => {
		render(<foo />, scratch);
		expect(scratch.childNodes).to.have.length(1);
		expect(scratch.firstChild).to.have.property('nodeName', 'FOO');

		scratch.parentNode.removeChild(scratch);
		scratch = document.createElement('div');
		(document.body || document.documentElement).appendChild(scratch);

		render(<x-bar />, scratch);
		expect(scratch.childNodes).to.have.length(1);
		expect(scratch.firstChild).to.have.property('nodeName', 'X-BAR');
	});

	it('should support the form attribute', () => {
		render(
			<div>
				<form id="myform" />
				<button form="myform">test</button>
				<input form="myform" />
			</div>,
			scratch
		);
		const div = scratch.childNodes[0];
		const form = div.childNodes[0];
		const button = div.childNodes[1];
		const input = div.childNodes[2];

		// IE11 doesn't support the form attribute
		if (!/(Trident)/.test(navigator.userAgent)) {
			expect(button).to.have.property('form', form);
			expect(input).to.have.property('form', form);
		}
	});

	it('should allow VNode reuse', () => {
		let reused = <div class="reuse">Hello World!</div>;
		render(
			<div>
				{reused}
				<span />
				{reused}
			</div>,
			scratch
		);
		expect(scratch.innerHTML).to.eql(
			`<div><div class="reuse">Hello World!</div><span></span><div class="reuse">Hello World!</div></div>`
		);

		render(
			<div>
				<span />
				{reused}
			</div>,
			scratch
		);
		expect(scratch.innerHTML).to.eql(
			`<div><span></span><div class="reuse">Hello World!</div></div>`
		);
	});

	it('should merge new elements when called multiple times', () => {
		render(<div />, scratch);
		expect(scratch.childNodes).to.have.length(1);
		expect(scratch.firstChild).to.have.property('nodeName', 'DIV');
		expect(scratch.innerHTML).to.equal('<div></div>');

		render(<span />, scratch);
		expect(scratch.childNodes).to.have.length(1);
		expect(scratch.firstChild).to.have.property('nodeName', 'SPAN');
		expect(scratch.innerHTML).to.equal('<span></span>');

		render(<span class="hello">Hello!</span>, scratch);
		expect(scratch.childNodes).to.have.length(1);
		expect(scratch.firstChild).to.have.property('nodeName', 'SPAN');
		expect(scratch.innerHTML).to.equal('<span class="hello">Hello!</span>');
	});

	it('should nest empty nodes', () => {
		render(
			<div>
				<span />
				<foo />
				<x-bar />
			</div>,
			scratch
		);

		expect(scratch.childNodes).to.have.length(1);
		expect(scratch.childNodes[0].nodeName).to.equal('DIV');

		let c = scratch.childNodes[0].childNodes;
		expect(c).to.have.length(3);
		expect(c[0].nodeName).to.equal('SPAN');
		expect(c[1].nodeName).to.equal('FOO');
		expect(c[2].nodeName).to.equal('X-BAR');
	});

	it('should not render falsy values', () => {
		render(
			<div>
				{null},{undefined},{false},{0},{NaN}
			</div>,
			scratch
		);

		expect(scratch.firstChild).to.have.property('innerHTML', ',,,0,NaN');
	});

	it('should not render null', () => {
		render(null, scratch);
		expect(scratch.innerHTML).to.equal('');
		expect(scratch.childNodes).to.have.length(0);
	});

	it('should not render undefined', () => {
		render(undefined, scratch);
		expect(scratch.innerHTML).to.equal('');
		expect(scratch.childNodes).to.have.length(0);
	});

	it('should not render boolean true', () => {
		render(true, scratch);
		expect(scratch.innerHTML).to.equal('');
		expect(scratch.childNodes).to.have.length(0);
	});

	it('should not render boolean false', () => {
		render(false, scratch);
		expect(scratch.innerHTML).to.equal('');
		expect(scratch.childNodes).to.have.length(0);
	});

	it('should not render children when using function children', () => {
		render(<div>{() => {}}</div>, scratch);
		expect(scratch.innerHTML).to.equal('<div></div>');
	});

	it('should render NaN as text content', () => {
		render(NaN, scratch);
		expect(scratch.innerHTML).to.equal('NaN');
	});

	it('should render numbers (0) as text content', () => {
		render(0, scratch);
		expect(scratch.innerHTML).to.equal('0');
	});

	it('should render numbers (42) as text content', () => {
		render(42, scratch);
		expect(scratch.innerHTML).to.equal('42');
	});

	it('should render strings as text content', () => {
		render('Testing, huh! How is it going?', scratch);
		expect(scratch.innerHTML).to.equal('Testing, huh! How is it going?');
	});

	it('should render arrays of mixed elements', () => {
		render(getMixedArray(), scratch);
		expect(scratch.innerHTML).to.equal(mixedArrayHTML);
	});

	it('should clear falsy attributes', () => {
		render(
			<div
				anull="anull"
				aundefined="aundefined"
				afalse="afalse"
				anan="aNaN"
				a0="a0"
			/>,
			scratch
		);

		render(
			<div
				anull={null}
				aundefined={undefined}
				afalse={false}
				anan={NaN}
				a0={0}
			/>,
			scratch
		);

		expect(
			getAttributes(scratch.firstChild),
			'from previous truthy values'
		).to.eql({
			a0: '0',
			anan: 'NaN'
		});
	});

	it('should not render falsy attributes on hydrate', () => {
		render(
			<div
				anull={null}
				aundefined={undefined}
				afalse={false}
				anan={NaN}
				a0={0}
			/>,
			scratch
		);

		expect(getAttributes(scratch.firstChild), 'initial render').to.eql({
			a0: '0',
			anan: 'NaN'
		});
	});

	it('should clear falsy input values', () => {
		// Note: this test just demonstrates the default browser behavior
		render(
			<div>
				<input value={0} />
				<input value={false} />
				<input value={null} />
				<input value={undefined} />
			</div>,
			scratch
		);

		let root = scratch.firstChild;
		expect(root.children[0]).to.have.property('value', '0');
		expect(root.children[1]).to.have.property('value', 'false');
		expect(root.children[2]).to.have.property('value', '');
		expect(root.children[3]).to.have.property('value', '');
	});

	it('should set value inside the specified range', () => {
		render(
			<input type="range" value={0.5} min="0" max="1" step="0.05" />,
			scratch
		);
		expect(scratch.firstChild.value).to.equal('0.5');
	});

	// IE or IE Edge will throw when attribute values don't conform to the
	// spec. That's the correct behaviour, but bad for this test...
	if (!/(Edge|MSIE|Trident)/.test(navigator.userAgent)) {
		it('should not clear falsy DOM properties', () => {
			function test(val) {
				render(
					<div>
						<input value={val} />
						<table border={val} />
					</div>,
					scratch
				);
			}

			test('2');
			test(false);
			expect(scratch.innerHTML).to.equal(
				'<div><input><table border="false"></table></div>',
				'for false'
			);

			test('3');
			test(null);
			expect(scratch.innerHTML).to.equal(
				'<div><input><table border=""></table></div>',
				'for null'
			);

			test('4');
			test(undefined);
			expect(scratch.innerHTML).to.equal(
				'<div><input><table border=""></table></div>',
				'for undefined'
			);
		});
	}

	// Test for preactjs/preact#651
	it('should set enumerable boolean attribute', () => {
		render(<input spellcheck={false} />, scratch);
		expect(scratch.firstChild.spellcheck).to.equal(false);
	});

	it('should not set tagName', () => {
		expect(() => render(<input tagName="div" />, scratch)).not.to.throw();
	});

	it('should apply string attributes', () => {
		render(<div foo="bar" data-foo="databar" />, scratch);
		expect(serializeHtml(scratch)).to.equal(
			'<div data-foo="databar" foo="bar"></div>'
		);
	});

	it('should not serialize function props as attributes', () => {
		render(<div click={function a() {}} ONCLICK={function b() {}} />, scratch);

		let div = scratch.childNodes[0];
		expect(div.attributes.length).to.equal(0);
	});

	it('should serialize object props as attributes', () => {
		render(
			<div
				foo={{ a: 'b' }}
				bar={{
					toString() {
						return 'abc';
					}
				}}
			/>,
			scratch
		);

		let div = scratch.childNodes[0];
		expect(div.attributes.length).to.equal(2);

		// Normalize attribute order because it's different in various browsers
		let normalized = {};
		for (let i = 0; i < div.attributes.length; i++) {
			let attr = div.attributes[i];
			normalized[attr.name] = attr.value;
		}

		expect(normalized).to.deep.equal({
			bar: 'abc',
			foo: '[object Object]'
		});
	});

	it('should apply class as String', () => {
		render(<div class="foo" />, scratch);
		expect(scratch.childNodes[0]).to.have.property('className', 'foo');
	});

	it('should alias className to class', () => {
		render(<div className="bar" />, scratch);
		expect(scratch.childNodes[0]).to.have.property('className', 'bar');
	});

	describe('style attribute', () => {
		it('should apply style as String', () => {
			render(<div style="top: 5px; position: relative;" />, scratch);
			expect(scratch.childNodes[0].style.cssText).to.equal(
				'top: 5px; position: relative;'
			);
		});

		it('should not call CSSStyleDeclaration.setProperty for style strings', () => {
			render(<div style="top: 5px; position: relative;" />, scratch);
			sinon.stub(scratch.firstChild.style, 'setProperty');
			render(<div style="top: 10px; position: absolute;" />, scratch);
			expect(scratch.firstChild.style.setProperty).to.not.be.called;
		});

		it('should properly switch from string styles to object styles and back', () => {
			render(<div style="display: inline;">test</div>, scratch);

			let style = scratch.firstChild.style;
			expect(style.cssText).to.equal('display: inline;');

			render(<div style={{ color: 'red' }} />, scratch);
			expect(style.cssText).to.equal('color: red;');

			render(<div style="color: blue" />, scratch);
			expect(style.cssText).to.equal('color: blue;');

			render(<div style={{ color: 'yellow' }} />, scratch);
			expect(style.cssText).to.equal('color: yellow;');

			render(<div style="display: block" />, scratch);
			expect(style.cssText).to.equal('display: block;');
		});

		it('should serialize style objects', () => {
			const styleObj = {
				color: 'rgb(255, 255, 255)',
				background: 'rgb(255, 100, 0)',
				backgroundPosition: '10px 10px',
				'background-size': 'cover',
				gridRowStart: 1,
				padding: 5,
				top: 100,
				left: '100%'
			};

			render(<div style={styleObj}>test</div>, scratch);

			let style = scratch.firstChild.style;
			expect(style.color).to.equal('rgb(255, 255, 255)');
			expect(style.background).to.contain('rgb(255, 100, 0)');
			expect(style.backgroundPosition).to.equal('10px 10px');
			expect(style.backgroundSize).to.equal('cover');
			expect(style.padding).to.equal('5px');
			expect(style.top).to.equal('100px');
			expect(style.left).to.equal('100%');

			// Only check for this in browsers that support css grids
			if (typeof scratch.style.grid == 'string') {
				expect(style.gridRowStart).to.equal('1');
			}
		});

		it('should support opacity 0', () => {
			render(<div style={{ opacity: 1 }}>Test</div>, scratch);
			let style = scratch.firstChild.style;
			expect(style)
				.to.have.property('opacity')
				.that.equals('1');

			render(<div style={{ opacity: 0 }}>Test</div>, scratch);
			style = scratch.firstChild.style;
			expect(style)
				.to.have.property('opacity')
				.that.equals('0');
		});

		it('should replace previous style objects', () => {
			render(<div style={{ display: 'inline' }}>test</div>, scratch);

			let style = scratch.firstChild.style;
			expect(style.cssText).to.equal('display: inline;');
			expect(style)
				.to.have.property('display')
				.that.equals('inline');
			expect(style)
				.to.have.property('color')
				.that.equals('');
			expect(style.zIndex.toString()).to.equal('');

			render(
				<div style={{ color: 'rgb(0, 255, 255)', zIndex: '3' }}>test</div>,
				scratch
			);

			style = scratch.firstChild.style;
			expect(style.cssText).to.equal('color: rgb(0, 255, 255); z-index: 3;');
			expect(style)
				.to.have.property('display')
				.that.equals('');
			expect(style)
				.to.have.property('color')
				.that.equals('rgb(0, 255, 255)');

			// IE stores numeric z-index values as a number
			expect(style.zIndex.toString()).to.equal('3');

			render(
				<div style={{ color: 'rgb(0, 255, 255)', display: 'inline' }}>
					test
				</div>,
				scratch
			);

			style = scratch.firstChild.style;
			expect(style.cssText).to.equal(
				'color: rgb(0, 255, 255); display: inline;'
			);
			expect(style)
				.to.have.property('display')
				.that.equals('inline');
			expect(style)
				.to.have.property('color')
				.that.equals('rgb(0, 255, 255)');
			expect(style.zIndex.toString()).to.equal('');
		});

		it('should remove existing attributes', () => {
			const div = document.createElement('div');
			div.setAttribute('class', 'red');
			const span = document.createElement('span');
			const text = document.createTextNode('Hi');

			span.appendChild(text);
			div.appendChild(span);
			scratch.appendChild(div);

			const App = () => (
				<div>
					<span>Bye</span>
				</div>
			);

			render(<App />, scratch);
			expect(scratch.innerHTML).to.equal(
				'<div class=""><span>Bye</span></div>'
			);
		});

		it('should remove class attributes', () => {
			const App = props => (
				<div className={props.class}>
					<span>Bye</span>
				</div>
			);

			render(<App class="hi" />, scratch);
			expect(scratch.innerHTML).to.equal(
				'<div class="hi"><span>Bye</span></div>'
			);

			render(<App />, scratch);
			expect(scratch.innerHTML).to.equal(
				'<div class=""><span>Bye</span></div>'
			);
		});

		it('should remove old styles', () => {
			render(<div style={{ color: 'red' }} />, scratch);
			render(<div style={{ backgroundColor: 'blue' }} />, scratch);
			expect(scratch.firstChild.style.color).to.equal('');
			expect(scratch.firstChild.style.backgroundColor).to.equal('blue');
		});

		// Issue #1850
		it('should remove empty styles', () => {
			render(<div style={{ visibility: 'hidden' }} />, scratch);
			expect(scratch.firstChild.style.visibility).to.equal('hidden');
			render(<div style={{ visibility: undefined }} />, scratch);
			expect(scratch.firstChild.style.visibility).to.equal('');
		});

		// Skip test if the currently running browser doesn't support CSS Custom Properties
		if (window.CSS && CSS.supports('color', 'var(--fake-var)')) {
			it('should support css custom properties', () => {
				render(
					<div style={{ '--foo': 'red', color: 'var(--foo)' }}>test</div>,
					scratch
				);
				expect(sortCss(scratch.firstChild.style.cssText)).to.equal(
					'--foo: red; color: var(--foo);'
				);
				expect(window.getComputedStyle(scratch.firstChild).color).to.equal(
					'rgb(255, 0, 0)'
				);
			});

			it('should not add "px" suffix for custom properties', () => {
				render(
					<div style={{ '--foo': '100px', width: 'var(--foo)' }}>test</div>,
					scratch
				);
				expect(sortCss(scratch.firstChild.style.cssText)).to.equal(
					'--foo: 100px; width: var(--foo);'
				);
			});

			it('css vars should not be transformed into dash-separated', () => {
				render(
					<div
						style={{
							'--fooBar': 1,
							'--foo-baz': 2,
							opacity: 'var(--fooBar)',
							zIndex: 'var(--foo-baz)'
						}}
					>
						test
					</div>,
					scratch
				);
				expect(sortCss(scratch.firstChild.style.cssText)).to.equal(
					'--foo-baz: 2; --fooBar: 1; opacity: var(--fooBar); z-index: var(--foo-baz);'
				);
			});

			it('should call CSSStyleDeclaration.setProperty for css vars', () => {
				render(<div style={{ padding: '10px' }} />, scratch);
				sinon.stub(scratch.firstChild.style, 'setProperty');
				render(
					<div style={{ '--foo': '10px', padding: 'var(--foo)' }} />,
					scratch
				);
				expect(scratch.firstChild.style.setProperty).to.be.calledWith(
					'--foo',
					'10px'
				);
			});
		}
	});

	describe('event handling', () => {
		let proto;

		function fireEvent(on, type) {
			let e = document.createEvent('Event');
			e.initEvent(type, true, true);
			on.dispatchEvent(e);
		}

		beforeEach(() => {
			proto = document.createElement('div').constructor.prototype;

			sinon.spy(proto, 'addEventListener');
			sinon.spy(proto, 'removeEventListener');
		});

		afterEach(() => {
			proto.addEventListener.restore();
			proto.removeEventListener.restore();
		});

		it('should only register on* functions as handlers', () => {
			let click = () => {},
				onclick = () => {};

			render(<div click={click} onClick={onclick} />, scratch);

			expect(scratch.childNodes[0].attributes.length).to.equal(0);

			expect(
				proto.addEventListener
			).to.have.been.calledOnce.and.to.have.been.calledWithExactly(
				'click',
				sinon.match.func,
				false
			);
		});

		it('should only register truthy values as handlers', () => {
			function fooHandler() {}
			const falsyHandler = false;

			render(<div onClick={falsyHandler} onOtherClick={fooHandler} />, scratch);

			expect(scratch.childNodes[0]._listeners).to.deep.equal({
				OtherClick: fooHandler
			});
		});

		it('should support native event names', () => {
			let click = sinon.spy(),
				mousedown = sinon.spy();

			render(<div onclick={() => click(1)} onmousedown={mousedown} />, scratch);

			expect(proto.addEventListener)
				.to.have.been.calledTwice.and.to.have.been.calledWith('click')
				.and.calledWith('mousedown');

			fireEvent(scratch.childNodes[0], 'click');
			expect(click).to.have.been.calledOnce.and.calledWith(1);
		});

		it('should support camel-case event names', () => {
			let click = sinon.spy(),
				mousedown = sinon.spy();

			render(<div onClick={() => click(1)} onMouseDown={mousedown} />, scratch);

			expect(proto.addEventListener)
				.to.have.been.calledTwice.and.to.have.been.calledWith('click')
				.and.calledWith('mousedown');

			fireEvent(scratch.childNodes[0], 'click');
			expect(click).to.have.been.calledOnce.and.calledWith(1);
		});

		it('should update event handlers', () => {
			let click1 = sinon.spy();
			let click2 = sinon.spy();

			render(<div onClick={click1} />, scratch);

			fireEvent(scratch.childNodes[0], 'click');
			expect(click1).to.have.been.calledOnce;
			expect(click2).to.not.have.been.called;

			click1.resetHistory();
			click2.resetHistory();

			render(<div onClick={click2} />, scratch);

			fireEvent(scratch.childNodes[0], 'click');
			expect(click1).to.not.have.been.called;
			expect(click2).to.have.been.called;
		});

		it('should remove event handlers', () => {
			let click = sinon.spy(),
				mousedown = sinon.spy();

			render(<div onClick={() => click(1)} onMouseDown={mousedown} />, scratch);
			render(<div onClick={() => click(2)} />, scratch);

			expect(proto.removeEventListener).to.have.been.calledWith('mousedown');

			fireEvent(scratch.childNodes[0], 'mousedown');
			expect(mousedown).not.to.have.been.called;

			proto.removeEventListener.resetHistory();
			click.resetHistory();
			mousedown.resetHistory();

			render(<div />, scratch);

			expect(proto.removeEventListener).to.have.been.calledWith('click');

			fireEvent(scratch.childNodes[0], 'click');
			expect(click).not.to.have.been.called;
		});

		it('should register events not appearing on dom nodes', () => {
			let onAnimationEnd = () => {};

			render(<div onanimationend={onAnimationEnd} />, scratch);
			expect(
				proto.addEventListener
			).to.have.been.calledOnce.and.to.have.been.calledWithExactly(
				'animationend',
				sinon.match.func,
				false
			);
		});

		// Skip test if browser doesn't support passive events
		if (supportsPassiveEvents()) {
			it('should use capturing for event props ending with *Capture', () => {
				let click = sinon.spy(),
					focus = sinon.spy();

				render(
					<div onClickCapture={click} onFocusCapture={focus}>
						<button />
					</div>,
					scratch
				);

				let root = scratch.firstChild;
				root.firstElementChild.click();
				root.firstElementChild.focus();

				expect(click, 'click').to.have.been.calledOnce;

				if (DISABLE_FLAKEY !== true) {
					// Focus delegation requires a 50b hack I'm not sure we want to incur
					expect(focus, 'focus').to.have.been.calledOnce;

					// IE doesn't set it
					if (!/Edge/.test(navigator.userAgent)) {
						expect(click).to.have.been.calledWithMatch({ eventPhase: 0 }); // capturing
						expect(focus).to.have.been.calledWithMatch({ eventPhase: 0 }); // capturing
					}
				}
			});
		}
	});

	describe('dangerouslySetInnerHTML', () => {
		it('should support dangerouslySetInnerHTML', () => {
			let html = '<b>foo &amp; bar</b>';
			// eslint-disable-next-line react/no-danger
			render(<div dangerouslySetInnerHTML={{ __html: html }} />, scratch);

			expect(scratch.firstChild, 'set').to.have.property('innerHTML', html);
			expect(scratch.innerHTML).to.equal('<div>' + html + '</div>');

			render(
				<div>
					a<strong>b</strong>
				</div>,
				scratch
			);

			expect(scratch, 'unset').to.have.property(
				'innerHTML',
				`<div>a<strong>b</strong></div>`
			);

			// eslint-disable-next-line react/no-danger
			render(<div dangerouslySetInnerHTML={{ __html: html }} />, scratch);
			expect(scratch.innerHTML, 're-set').to.equal('<div>' + html + '</div>');
		});

		it('should apply proper mutation for VNodes with dangerouslySetInnerHTML attr', () => {
			let thing;
			class Thing extends Component {
				constructor(props, context) {
					super(props, context);
					this.state = { html: this.props.html };
					thing = this;
				}
				render(props, { html }) {
					// eslint-disable-next-line react/no-danger
					return html ? (
						<div dangerouslySetInnerHTML={{ __html: html }} />
					) : (
						<div />
					);
				}
			}

			render(<Thing html="<b><i>test</i></b>" />, scratch);
			expect(scratch.innerHTML).to.equal('<div><b><i>test</i></b></div>');

			thing.setState({ html: false });
			rerender();
			expect(scratch.innerHTML).to.equal('<div></div>');

			thing.setState({ html: '<foo><bar>test</bar></foo>' });
			rerender();
			expect(scratch.innerHTML).to.equal(
				'<div><foo><bar>test</bar></foo></div>'
			);
		});

		it('should not hydrate with dangerouslySetInnerHTML', () => {
			let html = '<b>foo &amp; bar</b>';
			scratch.innerHTML = `<div>${html}</div>`;
			// eslint-disable-next-line react/no-danger
			render(<div dangerouslySetInnerHTML={{ __html: html }} />, scratch);

			expect(scratch.firstChild).to.have.property('innerHTML', html);
			expect(scratch.innerHTML).to.equal(`<div>${html}</div>`);
		});

		it('should avoid reapplying innerHTML when __html property of dangerouslySetInnerHTML attr remains unchanged', () => {
			class Thing extends Component {
				render() {
					// eslint-disable-next-line react/no-danger
					return (
						<div dangerouslySetInnerHTML={{ __html: '<span>same</span>' }} />
					);
				}
			}

			let thing;
			render(<Thing ref={r => (thing = r)} />, scratch);

			let firstInnerHTMLChild = scratch.firstChild.firstChild;

			// Re-render
			thing.forceUpdate();

			expect(firstInnerHTMLChild).to.equalNode(scratch.firstChild.firstChild);
		});
	});

	it('should reconcile mutated DOM attributes', () => {
		let check = p => render(<input type="checkbox" checked={p} />, scratch),
			value = () => scratch.lastChild.checked,
			setValue = p => (scratch.lastChild.checked = p);
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

	it('should reorder child pairs', () => {
		render(
			<div>
				<a>a</a>
				<b>b</b>
			</div>,
			scratch
		);

		let a = scratch.firstChild.firstChild;
		let b = scratch.firstChild.lastChild;

		expect(a).to.have.property('nodeName', 'A');
		expect(b).to.have.property('nodeName', 'B');

		render(
			<div>
				<b>b</b>
				<a>a</a>
			</div>,
			scratch
		);

		expect(scratch.firstChild.firstChild).to.equalNode(b);
		expect(scratch.firstChild.lastChild).to.equalNode(a);
	});

	// Discussion: https://github.com/preactjs/preact/issues/287
	// <datalist> is not supported in Safari, even though the element
	// constructor is present
	if (supportsDataList()) {
		it('should allow <input list /> to pass through as an attribute', () => {
			render(
				<div>
					<input type="range" min="0" max="100" list="steplist" />
					<datalist id="steplist">
						<option>0</option>
						<option>50</option>
						<option>100</option>
					</datalist>
				</div>,
				scratch
			);

			let html = scratch.firstElementChild.firstElementChild.outerHTML;
			expect(sortAttributes(html)).to.equal(
				sortAttributes('<input type="range" min="0" max="100" list="steplist">')
			);
		});
	}

	it('should not execute append operation when child is at last', () => {
		// See preactjs/preact#717 for discussion about the issue this addresses

		let todoText = 'new todo that I should complete';
		let input;
		let setText;
		let addTodo;

		const ENTER = 13;

		class TodoList extends Component {
			constructor(props) {
				super(props);
				this.state = { todos: [], text: '' };
				setText = this.setText = this.setText.bind(this);
				addTodo = this.addTodo = this.addTodo.bind(this);
			}
			setText(e) {
				this.setState({ text: e.target.value });
			}
			addTodo(e) {
				if (e.keyCode === ENTER) {
					let { todos, text } = this.state;
					todos = todos.concat({ text });
					this.setState({ todos, text: '' });
				}
			}
			render() {
				const { todos, text } = this.state;
				return (
					<div onKeyDown={this.addTodo}>
						{todos.map(todo => [
							<span>{todo.text}</span>,
							<span>
								{' '}
								[ <a href="javascript:;">Delete</a> ]
							</span>,
							<br />
						])}
						<input value={text} onInput={this.setText} ref={i => (input = i)} />
					</div>
				);
			}
		}

		render(<TodoList />, scratch);

		// Simulate user typing
		input.focus();
		input.value = todoText;
		setText({
			target: input
		});

		// Commit the user typing setState call
		rerender();

		// Simulate user pressing enter
		addTodo({
			keyCode: ENTER
		});

		// Before Preact rerenders, focus should be on the input
		expect(document.activeElement).to.equalNode(input);

		rerender();

		// After Preact rerenders, focus should remain on the input
		expect(document.activeElement).to.equalNode(input);
		expect(scratch.innerHTML).to.contain(`<span>${todoText}</span>`);
	});

	it('should keep value of uncontrolled inputs', () => {
		render(<input value={undefined} />, scratch);
		scratch.firstChild.value = 'foo';
		render(<input value={undefined} />, scratch);
		expect(scratch.firstChild.value).to.equal('foo');
	});

	it('should keep value of uncontrolled checkboxes', () => {
		render(<input type="checkbox" checked={undefined} />, scratch);
		scratch.firstChild.checked = true;
		render(<input type="checkbox" checked={undefined} />, scratch);
		expect(scratch.firstChild.checked).to.equal(true);
	});

	it('should always diff `checked` and `value` properties against the DOM', () => {
		// See https://github.com/preactjs/preact/issues/1324

		let inputs;
		let text;
		let checkbox;

		class Inputs extends Component {
			render() {
				return (
					<div>
						<input value={'Hello'} ref={el => (text = el)} />
						<input type="checkbox" checked ref={el => (checkbox = el)} />
					</div>
				);
			}
		}

		render(<Inputs ref={x => (inputs = x)} />, scratch);

		expect(text.value).to.equal('Hello');
		expect(checkbox.checked).to.equal(true);

		text.value = 'World';
		checkbox.checked = false;

		inputs.forceUpdate();
		rerender();

		expect(text.value).to.equal('Hello');
		expect(checkbox.checked).to.equal(true);
	});

	it('should not re-render when a component returns undefined', () => {
		let Dialog = () => undefined;
		let updateState;
		class App extends Component {
			constructor(props) {
				super(props);
				this.state = { name: '' };
				updateState = () => this.setState({ name: ', friend' });
			}

			render(props, { name }) {
				return (
					<div>
						<Dialog />
						<h1 class="fade-down">Hi{name}</h1>
					</div>
				);
			}
		}

		render(<App />, scratch);
		clearLog();

		updateState();
		rerender();

		// We don't log text updates
		expect(getLog()).to.deep.equal([]);
	});

	it('should not lead to stale DOM nodes', () => {
		let i = 0;
		let updateApp;
		class App extends Component {
			render() {
				updateApp = () => this.forceUpdate();
				return <Parent />;
			}
		}

		let updateParent;
		function Parent() {
			updateParent = () => this.forceUpdate();
			i++;
			return <Child i={i} />;
		}

		function Child({ i }) {
			return i < 3 ? null : <div>foo</div>;
		}

		render(<App />, scratch);

		updateApp();
		rerender();
		updateParent();
		rerender();
		updateApp();
		rerender();

		// Without a fix it would render: `<div>foo</div><div></div>`
		expect(scratch.innerHTML).to.equal('<div>foo</div>');
	});

	// see preact/#1327
	it('should not reuse unkeyed components', () => {
		class X extends Component {
			constructor() {
				super();
				this.state = { i: 0 };
			}

			update() {
				this.setState(prev => ({ i: prev.i + 1 }));
			}

			componentWillUnmount() {
				clearTimeout(this.id);
			}

			render() {
				return <div>{this.state.i}</div>;
			}
		}

		let ref;
		let updateApp;
		class App extends Component {
			constructor() {
				super();
				this.state = { i: 0 };
				updateApp = () => this.setState(prev => ({ i: prev.i ^ 1 }));
			}

			render() {
				return (
					<div>
						{this.state.i === 0 && <X />}
						<X ref={node => (ref = node)} />
					</div>
				);
			}
		}

		render(<App />, scratch);
		expect(scratch.textContent).to.equal('00');

		ref.update();
		updateApp();
		rerender();
		expect(scratch.textContent).to.equal('1');

		updateApp();
		rerender();

		expect(scratch.textContent).to.equal('01');
	});

	it('should call unmount when working with replaceNode', () => {
		const mountSpy = sinon.spy();
		const unmountSpy = sinon.spy();
		class MyComponent extends Component {
			componentDidMount() {
				mountSpy();
			}
			componentWillUnmount() {
				unmountSpy();
			}
			render() {
				return <div>My Component</div>;
			}
		}

		const container = document.createElement('div');
		scratch.appendChild(container);
		render(<MyComponent />, scratch, container);
		expect(mountSpy).to.be.calledOnce;

		render(<div>Not my component</div>, document.body, container);
		expect(unmountSpy).to.be.calledOnce;
	});

	it('should double replace', () => {
		const container = document.createElement('div');
		scratch.appendChild(container);
		render(<div>Hello</div>, scratch, scratch.firstElementChild);
		expect(scratch.innerHTML).to.equal('<div>Hello</div>');

		render(<div>Hello</div>, scratch, scratch.firstElementChild);
		expect(scratch.innerHTML).to.equal('<div>Hello</div>');
	});

	it('should replaceNode after rendering', () => {
		function App({ i }) {
			return <p>{i}</p>;
		}

		render(<App i={2} />, scratch);
		expect(scratch.innerHTML).to.equal('<p>2</p>');

		render(<App i={3} />, scratch, scratch.firstChild);
		expect(scratch.innerHTML).to.equal('<p>3</p>');
	});

	it('should not cause infinite loop with referentially equal props', () => {
		let i = 0;
		let prevDiff = options._diff;
		options._diff = () => {
			if (++i > 10) {
				options._diff = prevDiff;
				throw new Error('Infinite loop');
			}
		};

		function App({ children, ...rest }) {
			return (
				<div {...rest}>
					<div {...rest}>{children}</div>
				</div>
			);
		}

		render(<App>10</App>, scratch);
		expect(scratch.textContent).to.equal('10');
		options._diff = prevDiff;
	});

	describe('replaceNode parameter', () => {
		function appendChildToScratch(id) {
			const child = document.createElement('div');
			child.id = id;
			scratch.appendChild(child);
		}

		beforeEach(() => {
			['a', 'b', 'c'].forEach(id => appendChildToScratch(id));
		});

		it('should use replaceNode as render root and not inject into it', () => {
			const childA = scratch.querySelector('#a');
			render(<div id="a">contents</div>, scratch, childA);
			expect(scratch.querySelector('#a')).to.equalNode(childA);
			expect(childA.innerHTML).to.equal('contents');
		});

		it('should not remove siblings of replaceNode', () => {
			const childA = scratch.querySelector('#a');
			render(<div id="a" />, scratch, childA);
			expect(scratch.innerHTML).to.equal(
				'<div id="a"></div><div id="b"></div><div id="c"></div>'
			);
		});

		it('should notice prop changes on replaceNode', () => {
			const childA = scratch.querySelector('#a');
			render(<div id="a" className="b" />, scratch, childA);
			expect(sortAttributes(String(scratch.innerHTML))).to.equal(
				sortAttributes(
					'<div id="a" class="b"></div><div id="b"></div><div id="c"></div>'
				)
			);
		});

		it('should unmount existing components', () => {
			const newScratch = setupScratch();
			const unmount = sinon.spy();
			const mount = sinon.spy();
			class App extends Component {
				componentDidMount() {
					mount();
				}

				componentWillUnmount() {
					unmount();
				}

				render() {
					return <div>App</div>;
				}
			}
			render(
				<div id="a">
					<App />
				</div>,
				newScratch
			);
			expect(newScratch.innerHTML).to.equal('<div id="a"><div>App</div></div>');
			expect(mount).to.be.calledOnce;
			render(<div id="a">new</div>, newScratch, newScratch.querySelector('#a'));
			expect(newScratch.innerHTML).to.equal('<div id="a">new</div>');
			expect(unmount).to.be.calledOnce;

			newScratch.parentNode.removeChild(newScratch);
		});

		it('should render multiple render roots in one parentDom', () => {
			const childA = scratch.querySelector('#a');
			const childB = scratch.querySelector('#b');
			const childC = scratch.querySelector('#c');
			const expectedA = '<div id="a">childA</div>';
			const expectedB = '<div id="b">childB</div>';
			const expectedC = '<div id="c">childC</div>';
			render(<div id="a">childA</div>, scratch, childA);
			render(<div id="b">childB</div>, scratch, childB);
			render(<div id="c">childC</div>, scratch, childC);
			expect(scratch.innerHTML).to.equal(
				`${expectedA}${expectedB}${expectedC}`
			);
		});
	});
});
