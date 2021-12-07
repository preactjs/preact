import React, {
	createElement,
	render,
	Component,
	hydrate,
	createContext
} from 'preact/compat';
import { setupRerender, act } from 'preact/test-utils';
import {
	setupScratch,
	teardown,
	serializeHtml,
	createEvent
} from '../../../test/_util/helpers';

describe('compat render', () => {
	let spy = (name, ...args) => {
		let spy = sinon.spy(...args);
		spy.displayName = `spy('${name}')`;
		return spy;
	};

	/** @type {HTMLDivElement} */
	let scratch;

	/** @type {() => void} */
	let rerender;

	const ce = type => document.createElement(type);
	const text = text => document.createTextNode(text);

	beforeEach(() => {
		scratch = setupScratch();
		rerender = setupRerender();
	});

	afterEach(() => {
		teardown(scratch);
	});

	it('should render react-style jsx', () => {
		let jsx = (
			<div className="foo bar" data-foo="bar">
				<span id="some_id">inner!</span>
				{['a', 'b']}
			</div>
		);

		expect(jsx.props).to.have.property('className', 'foo bar');

		React.render(jsx, scratch);
		expect(serializeHtml(scratch)).to.equal(
			'<div class="foo bar" data-foo="bar"><span id="some_id">inner!</span>ab</div>'
		);
	});

	it('should replace isomorphic content', () => {
		let root = ce('div');
		let initialChild = ce('div');
		initialChild.appendChild(text('initial content'));
		root.appendChild(initialChild);

		render(<div>dynamic content</div>, root);
		expect(root)
			.to.have.property('textContent')
			.that.is.a('string')
			.that.equals('dynamic content');
	});

	it('should remove extra elements', () => {
		let root = ce('div');
		let inner = ce('div');

		root.appendChild(inner);

		let c1 = ce('div');
		c1.appendChild(text('isomorphic content'));
		inner.appendChild(c1);

		let c2 = ce('div');
		c2.appendChild(text('extra content'));
		inner.appendChild(c2);

		render(<div>dynamic content</div>, root);
		expect(root)
			.to.have.property('textContent')
			.that.is.a('string')
			.that.equals('dynamic content');
	});

	// Note: Replacing text nodes inside the root itself is currently unsupported.
	// We do replace them everywhere else, though.
	it('should remove text nodes', () => {
		let root = ce('div');

		let div = ce('div');
		root.appendChild(div);
		div.appendChild(text('Text Content'));
		div.appendChild(text('More Text Content'));

		render(<div>dynamic content</div>, root);
		expect(root)
			.to.have.property('textContent')
			.that.is.a('string')
			.that.equals('dynamic content');
	});

	it('should ignore maxLength / minLength when is null', () => {
		render(<input maxLength={null} minLength={null} />, scratch);
		expect(scratch.firstElementChild.getAttribute('maxlength')).to.equal(null);
		expect(scratch.firstElementChild.getAttribute('minlength')).to.equal(null);
	});

	it('should support defaultValue', () => {
		render(<input defaultValue="foo" />, scratch);
		expect(scratch.firstElementChild).to.have.property('value', 'foo');
	});

	it('should add defaultValue when value is null/undefined', () => {
		render(<input defaultValue="foo" value={null} />, scratch);
		expect(scratch.firstElementChild).to.have.property('value', 'foo');

		render(<input defaultValue="foo" value={undefined} />, scratch);
		expect(scratch.firstElementChild).to.have.property('value', 'foo');
	});

	it('should support defaultValue for select tag', () => {
		function App() {
			return (
				<select defaultValue="2">
					<option value="1">Picked 1</option>
					<option value="2">Picked 2</option>
					<option value="3">Picked 3</option>
				</select>
			);
		}

		render(<App />, scratch);
		const options = scratch.firstChild.children;
		expect(options[0]).to.have.property('selected', false);
		expect(options[1]).to.have.property('selected', true);
	});

	it('should support defaultValue for select tag when using multi selection', () => {
		function App() {
			return (
				<select multiple defaultValue={['1', '3']}>
					<option value="1">Picked 1</option>
					<option value="2">Picked 2</option>
					<option value="3">Picked 3</option>
				</select>
			);
		}

		render(<App />, scratch);
		const options = scratch.firstChild.children;
		expect(options[0]).to.have.property('selected', true);
		expect(options[1]).to.have.property('selected', false);
		expect(options[2]).to.have.property('selected', true);
	});

	it('should ignore defaultValue when value is 0', () => {
		render(<input defaultValue={2} value={0} />, scratch);
		expect(scratch.firstElementChild.value).to.equal('0');
	});

	it('should keep value of uncontrolled inputs using defaultValue', () => {
		// See https://github.com/preactjs/preact/issues/2391

		const spy = sinon.spy();

		class Input extends Component {
			render() {
				return (
					<input
						type="text"
						defaultValue="bar"
						onChange={() => {
							spy();
							this.forceUpdate();
						}}
					/>
				);
			}
		}

		render(<Input />, scratch);
		expect(scratch.firstChild.value).to.equal('bar');
		scratch.firstChild.focus();
		scratch.firstChild.value = 'foo';

		scratch.firstChild.dispatchEvent(createEvent('input'));
		rerender();
		expect(scratch.firstChild.value).to.equal('foo');
		expect(spy).to.be.calledOnce;
	});

	it('should call the callback', () => {
		let spy = sinon.spy();
		render(<div />, scratch, spy);
		expect(spy).to.be.calledOnce;
		expect(spy).to.be.calledWithExactly();
	});

	// Issue #1727
	it('should destroy the any existing DOM nodes inside the container', () => {
		scratch.appendChild(document.createElement('div'));
		scratch.appendChild(document.createElement('div'));

		render(<span>foo</span>, scratch);
		expect(scratch.innerHTML).to.equal('<span>foo</span>');
	});

	it('should only destroy existing DOM nodes on first render', () => {
		scratch.appendChild(document.createElement('div'));
		scratch.appendChild(document.createElement('div'));

		render(<input />, scratch);

		let child = scratch.firstChild;
		child.focus();
		render(<input />, scratch);
		expect(document.activeElement.nodeName).to.equal('INPUT');
	});

	it('should normalize class+className even on components', () => {
		function Foo(props) {
			return (
				<div class={props.class} className={props.className}>
					foo
				</div>
			);
		}
		render(<Foo class="foo" />, scratch);
		expect(scratch.firstChild.className).to.equal('foo');
		render(null, scratch);

		render(<Foo className="foo" />, scratch);
		expect(scratch.firstChild.className).to.equal('foo');
	});

	it('should normalize className when it has an empty string', () => {
		function Foo(props) {
			expect(props.className).to.equal('');
			return <div className="">foo</div>;
		}

		render(<Foo className="" />, scratch);
	});

	// Issue #2275
	it('should normalize class+className + DOM properties', () => {
		function Foo(props) {
			return <ul class="old" {...props} />;
		}

		render(<Foo fontSize="xlarge" className="new" />, scratch);
		expect(scratch.firstChild.className).to.equal('new');
	});

	it('should correctly allow for "className"', () => {
		const Foo = props => {
			const { className, ...rest } = props;
			return (
				<div class={className}>
					<p {...rest}>Foo</p>
				</div>
			);
		};

		render(<Foo className="foo" />, scratch);
		expect(scratch.firstChild.className).to.equal('foo');
		expect(scratch.firstChild.firstChild.className).to.equal('');
	});

	it('should give precedence to last-applied class/className prop', () => {
		render(<ul className="from className" class="from class" />, scratch);
		expect(scratch.firstChild.className).to.equal('from className');

		render(<ul class="from class" className="from className" />, scratch);
		expect(scratch.firstChild.className).to.equal('from className');
	});

	describe('className normalization', () => {
		it('should give precedence to className over class', () => {
			const { props } = <ul className="from className" class="from class" />;
			expect(props).to.have.property('className', 'from className');
			expect(props).to.have.property('class', 'from className');
		});

		it('should preserve className, add class alias', () => {
			const { props } = <ul className="from className" />;
			expect(props).to.have.property('className', 'from className');
			expect(props).to.have.property('class', 'from className');
		});

		it('should preserve class, and add className alias', () => {
			const { props } = <ul class="from class" />;
			expect(props).to.have.property('class', 'from class');
			expect(props.propertyIsEnumerable('className')).to.equal(false);
			expect(props).to.have.property('className', 'from class');
		});

		it('should preserve class when spreading', () => {
			const { props } = <ul class="from class" />;
			const spreaded = (<li a {...props} />).props;
			expect(spreaded).to.have.property('class', 'from class');
			expect(spreaded.propertyIsEnumerable('className')).to.equal(false);
			expect(spreaded).to.have.property('className', 'from class');
		});

		it('should preserve className when spreading', () => {
			const { props } = <ul className="from className" />;
			const spreaded = (<li a {...props} />).props;
			expect(spreaded).to.have.property('className', 'from className');
			expect(spreaded).to.have.property('class', 'from className');
			expect(spreaded.propertyIsEnumerable('class')).to.equal(true);
		});

		// Issue #2772
		it('should give precedence to className from spread props', () => {
			const Foo = ({ className, ...props }) => {
				return <div className={`${className} foo`} {...props} />;
			};
			render(<Foo className="bar" />, scratch);
			expect(scratch.firstChild.className).to.equal('bar foo');
		});

		it('should give precedence to class from spread props', () => {
			const Foo = ({ class: c, ...props }) => {
				return <div class={`${c} foo`} {...props} />;
			};
			render(<Foo class="bar" />, scratch);
			expect(scratch.firstChild.className).to.equal('bar foo');
		});

		// Issue #2224
		it('should not mark both class and className as enumerable', () => {
			function ClassNameCheck(props) {
				return (
					<div>{props.propertyIsEnumerable('className') ? 'Failed' : ''}</div>
				);
			}

			let update;
			class OtherThing extends Component {
				render({ children }) {
					update = () => this.forceUpdate();
					return (
						<div>
							{children}
							<ClassNameCheck class="test" />
						</div>
					);
				}
			}

			function App() {
				return (
					<OtherThing>
						<ClassNameCheck class="test" />
					</OtherThing>
				);
			}

			render(<App />, scratch);

			update();
			rerender();

			expect(/Failed/g.test(scratch.textContent)).to.equal(
				false,
				'not enumerable'
			);
		});
	});

	it('should cast boolean "download" values', () => {
		render(<a download />, scratch);
		expect(scratch.firstChild.getAttribute('download')).to.equal('');

		render(<a download={false} />, scratch);
		expect(scratch.firstChild.getAttribute('download')).to.equal(null);
	});

	it('should support static content', () => {
		const updateSpy = sinon.spy();
		const mountSpy = sinon.spy();
		const renderSpy = sinon.spy();

		function StaticContent({ children, element = 'div', staticMode }) {
			// if we're in the server or a spa navigation, just render it
			if (!staticMode) {
				return createElement(element, {
					children
				});
			}

			// avoid re-render on the client
			return createElement(element, {
				dangerouslySetInnerHTML: { __html: '' }
			});
		}

		class App extends Component {
			componentDidMount() {
				mountSpy();
			}

			componentDidUpdate() {
				updateSpy();
			}

			render() {
				renderSpy();
				return <div>Staticness</div>;
			}
		}

		act(() => {
			render(
				<StaticContent staticMode={false}>
					<App />
				</StaticContent>,
				scratch
			);
		});

		expect(scratch.innerHTML).to.eq('<div><div>Staticness</div></div>');
		expect(renderSpy).to.be.calledOnce;
		expect(mountSpy).to.be.calledOnce;
		expect(updateSpy).to.not.be.calledOnce;

		act(() => {
			hydrate(
				<StaticContent staticMode>
					<App />
				</StaticContent>,
				scratch
			);
		});

		expect(scratch.innerHTML).to.eq('<div><div>Staticness</div></div>');
		expect(renderSpy).to.be.calledOnce;
		expect(mountSpy).to.be.calledOnce;
		expect(updateSpy).to.not.be.calledOnce;
	});

	it('should transform react-style camel cased attributes', () => {
		render(
			<text dominantBaseline="middle" fontWeight="30px">
				foo
			</text>,
			scratch
		);
		expect(scratch.innerHTML).to.equal(
			'<text dominant-baseline="middle" font-weight="30px">foo</text>'
		);
	});

	it("should support react-relay's usage of __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED", () => {
		const Ctx = createContext('foo');

		// Simplified version of: https://github.com/facebook/relay/blob/fba79309977bf6b356ee77a5421ca5e6f306223b/packages/react-relay/readContext.js#L17-L28
		function readContext(Context) {
			const {
				ReactCurrentDispatcher
			} = React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED;
			const dispatcher = ReactCurrentDispatcher.current;
			return dispatcher.readContext(Context);
		}

		function Foo() {
			const value = readContext(Ctx);
			return <div>{value}</div>;
		}

		React.render(
			<Ctx.Provider value="foo">
				<Foo />
			</Ctx.Provider>,
			scratch
		);

		expect(scratch.textContent).to.equal('foo');
	});

	it('should append "px" to unitless inline css values', () => {
		// These are all CSS Properties that support a single <length> value
		// that must have a unit. If we encounter a number we append "px" to it.
		// The list is taken from: https://developer.mozilla.org/en-US/docs/Web/CSS/Reference
		const unitless = {
			'border-block': 2,
			'border-block-end-width': 3,
			'border-block-start-width': 4,
			'border-block-width': 5,
			'border-bottom-left-radius': 6,
			'border-bottom-right-radius': 7,
			'border-bottom-width': 8,
			'border-end-end-radius': 9,
			'border-end-start-radius': 10,
			'border-image-outset': 11,
			'border-image-width': 12,
			'border-inline': 2,
			'border-inline-end': 3,
			'border-inline-end-width': 4,
			'border-inline-start': 1,
			'border-inline-start-width': 123,
			'border-inline-width': 123,
			'border-left': 123,
			'border-left-width': 123,
			'border-radius': 123,
			'border-right': 123,
			'border-right-width': 123,
			'border-spacing': 123,
			'border-start-end-radius': 123,
			'border-start-start-radius': 123,
			'border-top': 123,
			'border-top-left-radius': 123,
			'border-top-right-radius': 123,
			'border-top-width': 123,
			'border-width': 123,
			bottom: 123,
			'column-gap': 123,
			'column-rule-width': 23,
			'column-width': 23,
			'flex-basis': 23,
			'font-size': 123,
			'grid-gap': 23,
			'grid-auto-columns': 123,
			'grid-auto-rows': 123,
			'grid-template-columns': 23,
			'grid-template-rows': 23,
			height: 123,
			'inline-size': 23,
			inset: 23,
			'inset-block-end': 12,
			'inset-block-start': 12,
			'inset-inline-end': 213,
			'inset-inline-start': 213,
			left: 213,
			'letter-spacing': 213,
			margin: 213,
			'margin-block': 213,
			'margin-block-end': 213,
			'margin-block-start': 213,
			'margin-bottom': 213,
			'margin-inline': 213,
			'margin-inline-end': 213,
			'margin-inline-start': 213,
			'margin-left': 213,
			'margin-right': 213,
			'margin-top': 213,
			'mask-position': 23,
			'mask-size': 23,
			'max-block-size': 23,
			'max-height': 23,
			'max-inline-size': 23,
			'max-width': 23,
			'min-block-size': 23,
			'min-height': 23,
			'min-inline-size': 23,
			'min-width': 23,
			'object-position': 23,
			'outline-offset': 23,
			'outline-width': 123,
			padding: 123,
			'padding-block': 123,
			'padding-block-end': 123,
			'padding-block-start': 123,
			'padding-bottom': 123,
			'padding-inline': 123,
			'padding-inline-end': 123,
			'padding-inline-start': 123,
			'padding-left': 123,
			'padding-right': 123,
			'padding-top': 123,
			perspective: 123,
			right: 123,
			'scroll-margin': 123,
			'scroll-margin-block': 123,
			'scroll-margin-block-start': 123,
			'scroll-margin-bottom': 123,
			'scroll-margin-inline': 123,
			'scroll-margin-inline-end': 123,
			'scroll-margin-inline-start': 123,
			'scroll-margin-inline-left': 123,
			'scroll-margin-inline-right': 123,
			'scroll-margin-inline-top': 123,
			'scroll-padding': 123,
			'scroll-padding-block': 123,
			'scroll-padding-block-end': 123,
			'scroll-padding-block-start': 123,
			'scroll-padding-bottom': 123,
			'scroll-padding-inline': 123,
			'scroll-padding-inline-end': 123,
			'scroll-padding-inline-start': 123,
			'scroll-padding-left': 123,
			'scroll-padding-right': 123,
			'scroll-padding-top': 123,
			'shape-margin': 123,
			'text-decoration-thickness': 123,
			'text-indent': 123,
			'text-underline-offset': 123,
			top: 123,
			'transform-origin': 123,
			translate: 123,
			width: 123,
			'word-spacing': 123
		};

		// These are all CSS properties that have valid numeric values.
		// Our appending logic must not be applied here
		const untouched = {
			'-webkit-line-clamp': 2,
			'animation-iteration-count': 3,
			'column-count': 2,
			columns: 2,
			flex: 1,
			'flex-grow': 1,
			'flex-shrink': 1,
			'font-size-adjust': 123,
			'font-weight': 12,
			'grid-column': 2,
			'grid-column-end': 2,
			'grid-column-start': 2,
			'grid-row': 2,
			'grid-row-end': 2,
			'grid-row-start': 2,
			'line-height': 2,
			'mask-border-outset': 2,
			'mask-border-slice': 2,
			'mask-border-width': 2,
			'max-zoom': 2,
			'min-zoom': 2,
			opacity: 123,
			order: 123,
			orphans: 2,
			'grid-row-gap': 23,
			scale: 23,
			'tab-size': 23,
			widows: 123,
			'z-index': 123,
			zoom: 123
		};

		render(
			<div
				style={{
					...unitless,
					...untouched
				}}
			/>,
			scratch
		);

		let style = scratch.firstChild.style;

		// Check properties that MUST not be changed
		for (const key in unitless) {
			// Check if css property is supported
			if (
				window.CSS &&
				typeof window.CSS.supports === 'function' &&
				window.CSS.supports(key, unitless[key])
			) {
				expect(
					String(style[key]).endsWith('px'),
					`Should append px "${key}: ${unitless[key]}" === "${key}: ${style[key]}"`
				).to.equal(true);
			}
		}

		// Check properties that MUST not be changed
		for (const key in untouched) {
			// Check if css property is supported
			if (
				window.CSS &&
				typeof window.CSS.supports === 'function' &&
				window.CSS.supports(key, untouched[key])
			) {
				expect(
					!String(style[key]).endsWith('px'),
					`Should be left as is: "${key}: ${untouched[key]}" === "${key}: ${style[key]}"`
				).to.equal(true);
			}
		}
	});

	describe('refs', () => {
		it('should pass components to ref functions', () => {
			let ref = spy('ref'),
				instance;
			class Foo extends Component {
				constructor() {
					super();
					instance = this;
				}
				render() {
					return <div />;
				}
			}
			render(<Foo ref={ref} />, scratch);

			expect(ref).to.have.been.calledOnce.and.calledWith(instance);
		});

		it('should pass rendered DOM from functional components to ref functions', () => {
			let ref = spy('ref');

			const Foo = () => <div />;

			render(<Foo ref={ref} />, scratch);
			expect(ref).to.have.been.calledOnce;

			ref.resetHistory();
			render(<Foo ref={ref} />, scratch);
			expect(ref).not.to.have.been.called;

			ref.resetHistory();
			render(<span />, scratch);
			expect(ref).to.have.been.calledOnce.and.calledWith(null);
		});

		it('should pass children to ref functions', () => {
			let outer = spy('outer'),
				inner = spy('inner'),
				InnermostComponent = 'span',
				update,
				inst;
			class Outer extends Component {
				constructor() {
					super();
					update = () => this.forceUpdate();
				}
				render() {
					return (
						<div>
							<Inner ref={outer} />
						</div>
					);
				}
			}
			class Inner extends Component {
				constructor() {
					super();
					inst = this;
				}
				render() {
					return <InnermostComponent ref={inner} />;
				}
			}

			render(<Outer />, scratch);

			expect(outer).to.have.been.calledOnce.and.calledWith(inst);
			expect(inner).to.have.been.calledOnce.and.calledWith(
				scratch.querySelector(InnermostComponent)
			);

			outer.resetHistory();
			inner.resetHistory();
			update();
			rerender();

			expect(outer, 're-render').not.to.have.been.called;
			expect(inner, 're-render').not.to.have.been.called;

			inner.resetHistory();
			InnermostComponent = 'x-span';
			update();
			rerender();

			expect(inner, 're-render swap');
			expect(inner.firstCall, 're-render swap').to.have.been.calledWith(null);
			expect(inner.secondCall, 're-render swap').to.have.been.calledWith(
				scratch.querySelector(InnermostComponent)
			);

			InnermostComponent = 'span';
			outer.resetHistory();
			inner.resetHistory();
			render(<div />, scratch);

			expect(outer, 'unrender').to.have.been.calledOnce.and.calledWith(null);
			expect(inner, 'unrender').to.have.been.calledOnce.and.calledWith(null);
		});

		it('should pass high-order children to ref functions', () => {
			let outer = spy('outer'),
				inner = spy('inner'),
				innermost = spy('innermost'),
				InnermostComponent = 'span',
				outerInst,
				innerInst;
			class Outer extends Component {
				constructor() {
					super();
					outerInst = this;
				}
				render() {
					return <Inner ref={inner} />;
				}
			}
			class Inner extends Component {
				constructor() {
					super();
					innerInst = this;
				}
				render() {
					return <InnermostComponent ref={innermost} />;
				}
			}

			render(<Outer ref={outer} />, scratch);

			expect(outer, 'outer initial').to.have.been.calledOnce.and.calledWith(
				outerInst
			);
			expect(inner, 'inner initial').to.have.been.calledOnce.and.calledWith(
				innerInst
			);
			expect(
				innermost,
				'innerMost initial'
			).to.have.been.calledOnce.and.calledWith(
				scratch.querySelector(InnermostComponent)
			);

			outer.resetHistory();
			inner.resetHistory();
			innermost.resetHistory();
			render(<Outer ref={outer} />, scratch);

			expect(outer, 'outer update').not.to.have.been.called;
			expect(inner, 'inner update').not.to.have.been.called;
			expect(innermost, 'innerMost update').not.to.have.been.called;

			innermost.resetHistory();
			InnermostComponent = 'x-span';
			render(<Outer ref={outer} />, scratch);

			expect(innermost, 'innerMost swap');
			expect(innermost.firstCall, 'innerMost swap').to.have.been.calledWith(
				null
			);
			expect(innermost.secondCall, 'innerMost swap').to.have.been.calledWith(
				scratch.querySelector(InnermostComponent)
			);
			InnermostComponent = 'span';

			outer.resetHistory();
			inner.resetHistory();
			innermost.resetHistory();
			render(<div />, scratch);

			expect(outer, 'outer unmount').to.have.been.calledOnce.and.calledWith(
				null
			);
			expect(inner, 'inner unmount').to.have.been.calledOnce.and.calledWith(
				null
			);
			expect(
				innermost,
				'innerMost unmount'
			).to.have.been.calledOnce.and.calledWith(null);
		});
	});
});
