import { setupRerender } from 'preact/test-utils';
import { createElement, render, Component, options } from 'preact';
import {
	setupScratch,
	teardown,
	getMixedArray,
	mixedArrayHTML,
	serializeHtml,
	supportsDataList,
	sortAttributes,
	spyOnElementAttributes
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

	it('should rerender when value from "" to 0', () => {
		render('', scratch);
		expect(scratch.innerHTML).to.equal('');

		render(0, scratch);
		expect(scratch.innerHTML).to.equal('0');
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

	it('should not throw error in IE11 with type date', () => {
		expect(() => render(<input type="date" />, scratch)).to.not.throw();
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
				<hr />
				{reused}
			</div>,
			scratch
		);
		expect(serializeHtml(scratch)).to.eql(
			`<div><div class="reuse">Hello World!</div><hr><div class="reuse">Hello World!</div></div>`
		);

		render(
			<div>
				<hr />
				{reused}
			</div>,
			scratch
		);
		expect(serializeHtml(scratch)).to.eql(
			`<div><hr><div class="reuse">Hello World!</div></div>`
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

	it('should render download attribute', () => {
		render(<a download="" />, scratch);
		expect(scratch.firstChild.getAttribute('download')).to.equal('');

		render(<a download={null} />, scratch);
		expect(scratch.firstChild.getAttribute('download')).to.equal(null);
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

	it('should support false aria-* attributes', () => {
		render(<div aria-checked="false" />, scratch);
		expect(scratch.firstChild.getAttribute('aria-checked')).to.equal('false');
	});

	it('should set checked attribute on custom elements without checked property', () => {
		render(<o-checkbox checked />, scratch);
		expect(scratch.innerHTML).to.equal(
			'<o-checkbox checked="true"></o-checkbox>'
		);
	});

	it('should set value attribute on custom elements without value property', () => {
		render(<o-input value="test" />, scratch);
		expect(scratch.innerHTML).to.equal('<o-input value="test"></o-input>');
	});

	it('should mask value on password input elements', () => {
		render(<input value="xyz" type="password" />, scratch);
		expect(scratch.innerHTML).to.equal('<input type="password">');
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

		it('should unmount dangerouslySetInnerHTML', () => {
			let set;

			const TextDiv = () => (
				<div dangerouslySetInnerHTML={{ __html: '' }}>some text</div>
			);

			class App extends Component {
				constructor(props) {
					super(props);
					set = this.setState.bind(this);
					this.state = { show: true };
				}

				render() {
					return this.state.show && <TextDiv />;
				}
			}

			render(<App />, scratch);
			expect(scratch.innerHTML).to.equal('<div></div>');

			set({ show: false });
			rerender();
			expect(scratch.innerHTML).to.equal('');
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

	// Issue #2284
	it('should not throw when setting size to an invalid value', () => {
		// These values are usually used to reset the `size` attribute to its
		// initial state.
		expect(() => render(<input size={undefined} />, scratch)).to.not.throw();
		expect(() => render(<input size={null} />, scratch)).to.not.throw();
		expect(() => render(<input size={0} />, scratch)).to.not.throw();
	});

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

	it('should not call options.debounceRendering unnecessarily', () => {
		let comp;

		class A extends Component {
			constructor(props) {
				super(props);
				this.state = { updates: 0 };
				comp = this;
			}

			render() {
				return <div>{this.state.updates}</div>;
			}
		}

		render(<A />, scratch);
		expect(scratch.innerHTML).to.equal('<div>0</div>');

		const sandbox = sinon.createSandbox();
		try {
			sandbox.spy(options, 'debounceRendering');

			comp.setState({ updates: 1 }, () => {
				comp.setState({ updates: 2 });
			});
			rerender();
			expect(scratch.innerHTML).to.equal('<div>2</div>');

			expect(options.debounceRendering).to.have.been.calledOnce;
		} finally {
			sandbox.restore();
		}
	});

	it('should remove attributes on pre-existing DOM', () => {
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
		expect(serializeHtml(scratch)).to.equal('<div><span>Bye</span></div>');
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
		expect(serializeHtml(scratch)).to.equal('<div><span>Bye</span></div>');
	});

	it('should not read DOM attributes on render without existing DOM', () => {
		const attributesSpy = spyOnElementAttributes();

		render(
			<div id="wrapper">
				<div id="page1">Page 1</div>
			</div>,
			scratch
		);
		expect(scratch.innerHTML).to.equal(
			'<div id="wrapper"><div id="page1">Page 1</div></div>'
		);
		expect(attributesSpy.get).to.not.have.been.called;

		render(
			<div id="wrapper">
				<div id="page2">Page 2</div>
			</div>,
			scratch
		);
		expect(scratch.innerHTML).to.equal(
			'<div id="wrapper"><div id="page2">Page 2</div></div>'
		);
		expect(attributesSpy.get).to.not.have.been.called;
	});
});
