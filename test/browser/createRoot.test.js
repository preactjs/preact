import { setupRerender } from 'preact/test-utils';
import {
	createElement,
	Component,
	options,
	createRoot,
	Fragment
} from 'preact';
import {
	setupScratch,
	teardown,
	getMixedArray,
	mixedArrayHTML,
	serializeHtml,
	supportsDataList,
	sortAttributes,
	spyOnElementAttributes,
	createEvent
} from '../_util/helpers';
import { clearLog, getLog, logCall } from '../_util/logCall';
import { useState } from 'preact/hooks';
import { ul, li, div } from '../_util/dom';

/** @jsx createElement */

function getAttributes(node) {
	let attrs = {};
	for (let i = node.attributes.length; i--; ) {
		attrs[node.attributes[i].name] = node.attributes[i].value;
	}
	return attrs;
}

const isIE11 = /Trident\//.test(navigator.userAgent);

describe('createRoot()', () => {
	describe('render', () => {
		let scratch, rerender;

		let resetAppendChild;
		let resetInsertBefore;
		let resetRemoveChild;
		let resetRemove;
		let render;

		beforeEach(() => {
			scratch = setupScratch();
			rerender = setupRerender();
			render = createRoot(scratch).render;
		});

		afterEach(() => {
			teardown(scratch);
		});

		before(() => {
			resetAppendChild = logCall(Element.prototype, 'appendChild');
			resetInsertBefore = logCall(Element.prototype, 'insertBefore');
			resetRemoveChild = logCall(Element.prototype, 'removeChild');
			resetRemove = logCall(Element.prototype, 'remove');
		});

		after(() => {
			resetAppendChild();
			resetInsertBefore();
			resetRemoveChild();
			resetRemove();
		});

		it('should rerender when value from "" to 0', () => {
			render('');
			expect(scratch.innerHTML).to.equal('');

			render(0);
			expect(scratch.innerHTML).to.equal('0');
		});

		it('should render an empty text node given an empty string', () => {
			render('');
			let c = scratch.childNodes;
			expect(c).to.have.length(1);
			expect(c[0].data).to.equal('');
			expect(c[0].nodeName).to.equal('#text');
		});

		it('should allow node type change with content', () => {
			render(<span>Bad</span>);
			render(<div>Good</div>);
			expect(scratch.innerHTML).to.eql(`<div>Good</div>`);
		});

		it('should not render when detecting JSON-injection', () => {
			const vnode = JSON.parse('{"type":"span","children":"Malicious"}');
			render(vnode);
			expect(scratch.innerHTML).to.equal('');
		});

		it('should create empty nodes (<* />)', () => {
			render(<div />);
			expect(scratch.childNodes).to.have.length(1);
			expect(scratch.childNodes[0].nodeName).to.equal('DIV');

			scratch.parentNode.removeChild(scratch);
			scratch = document.createElement('div');
			render = createRoot(scratch).render;
			(document.body || document.documentElement).appendChild(scratch);

			render(<span />);
			expect(scratch.childNodes).to.have.length(1);
			expect(scratch.childNodes[0].nodeName).to.equal('SPAN');
		});

		it('should not throw error in IE11 with type date', () => {
			expect(() => render(<input type="date" />)).to.not.throw();
		});

		it('should support custom tag names', () => {
			render(<foo />);
			expect(scratch.childNodes).to.have.length(1);
			expect(scratch.firstChild).to.have.property('nodeName', 'FOO');

			scratch.parentNode.removeChild(scratch);
			scratch = document.createElement('div');
			(document.body || document.documentElement).appendChild(scratch);
			render = createRoot(scratch).render;

			render(<x-bar />);
			expect(scratch.childNodes).to.have.length(1);
			expect(scratch.firstChild).to.have.property('nodeName', 'X-BAR');
		});

		it('should support the form attribute', () => {
			render(
				<div>
					<form id="myform" />
					<button form="myform">test</button>
					<input form="myform" />
				</div>
			);
			const div = scratch.childNodes[0];
			const form = div.childNodes[0];
			const button = div.childNodes[1];
			const input = div.childNodes[2];

			// IE11 doesn't support the form attribute
			if (!isIE11) {
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
				</div>
			);
			expect(serializeHtml(scratch)).to.eql(
				`<div><div class="reuse">Hello World!</div><hr><div class="reuse">Hello World!</div></div>`
			);

			render(
				<div>
					<hr />
					{reused}
				</div>
			);
			expect(serializeHtml(scratch)).to.eql(
				`<div><hr><div class="reuse">Hello World!</div></div>`
			);
		});

		it('should merge new elements when called multiple times', () => {
			render(<div />);
			expect(scratch.childNodes).to.have.length(1);
			expect(scratch.firstChild).to.have.property('nodeName', 'DIV');
			expect(scratch.innerHTML).to.equal('<div></div>');

			render(<span />);
			expect(scratch.childNodes).to.have.length(1);
			expect(scratch.firstChild).to.have.property('nodeName', 'SPAN');
			expect(scratch.innerHTML).to.equal('<span></span>');

			render(<span class="hello">Hello!</span>);
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
				</div>
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
				</div>
			);

			expect(scratch.firstChild).to.have.property('innerHTML', ',,,0,NaN');
		});

		it('should not render null', () => {
			render(null);
			expect(scratch.innerHTML).to.equal('');
			expect(scratch.childNodes).to.have.length(0);
		});

		it('should not render undefined', () => {
			render(undefined);
			expect(scratch.innerHTML).to.equal('');
			expect(scratch.childNodes).to.have.length(0);
		});

		it('should not render boolean true', () => {
			render(true);
			expect(scratch.innerHTML).to.equal('');
			expect(scratch.childNodes).to.have.length(0);
		});

		it('should not render boolean false', () => {
			render(false);
			expect(scratch.innerHTML).to.equal('');
			expect(scratch.childNodes).to.have.length(0);
		});

		it('should not render children when using function children', () => {
			render(<div>{() => {}}</div>);
			expect(scratch.innerHTML).to.equal('<div></div>');
		});

		it('should render NaN as text content', () => {
			render(NaN);
			expect(scratch.innerHTML).to.equal('NaN');
		});

		it('should render numbers (0) as text content', () => {
			render(0);
			expect(scratch.innerHTML).to.equal('0');
		});

		it('should render numbers (42) as text content', () => {
			render(42);
			expect(scratch.innerHTML).to.equal('42');
		});

		it('should render bigint as text content', () => {
			// Skip in browsers not supporting big integers
			if (typeof BigInt === 'undefined') {
				return;
			}

			// eslint-disable-next-line no-undef, new-cap
			render(BigInt(4));
			expect(scratch.innerHTML).to.equal('4');
		});

		it('should render strings as text content', () => {
			render('Testing, huh! How is it going?');
			expect(scratch.innerHTML).to.equal('Testing, huh! How is it going?');
		});

		it('should render arrays of mixed elements', () => {
			render(getMixedArray());
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
				/>
			);

			render(
				<div
					anull={null}
					aundefined={undefined}
					afalse={false}
					anan={NaN}
					a0={0}
				/>
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
				/>
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
				</div>
			);

			let root = scratch.firstChild;
			expect(root.children[0]).to.have.property('value', '0');
			expect(root.children[1]).to.have.property('value', 'false');
			expect(root.children[2]).to.have.property('value', '');
			expect(root.children[3]).to.have.property('value', '');
		});

		it('should set value inside the specified range', () => {
			render(<input type="range" value={0.5} min="0" max="1" step="0.05" />);
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
			render(<input spellcheck={false} />);
			expect(scratch.firstChild.spellcheck).to.equal(false);
		});

		it('should render download attribute', () => {
			render(<a download="" />);
			expect(scratch.firstChild.getAttribute('download')).to.equal('');

			render(<a download={null} />);
			expect(scratch.firstChild.getAttribute('download')).to.equal(null);
		});

		it('should not set tagName', () => {
			expect(() => render(<input tagName="div" />)).not.to.throw();
		});

		it('should apply string attributes', () => {
			render(<div foo="bar" data-foo="databar" />);
			expect(serializeHtml(scratch)).to.equal(
				'<div data-foo="databar" foo="bar"></div>'
			);
		});

		it('should not serialize function props as attributes', () => {
			render(<div click={function a() {}} ONCLICK={function b() {}} />);

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
				/>
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
			render(<div class="foo" />);
			expect(scratch.childNodes[0]).to.have.property('className', 'foo');
		});

		it('should alias className to class', () => {
			render(<div className="bar" />);
			expect(scratch.childNodes[0]).to.have.property('className', 'bar');
		});

		it('should support false aria-* attributes', () => {
			render(<div aria-checked="false" />);
			expect(scratch.firstChild.getAttribute('aria-checked')).to.equal('false');
		});

		it('should set checked attribute on custom elements without checked property', () => {
			render(<o-checkbox checked />);
			expect(scratch.innerHTML).to.equal(
				'<o-checkbox checked="true"></o-checkbox>'
			);
		});

		it('should set value attribute on custom elements without value property', () => {
			render(<o-input value="test" />);
			expect(scratch.innerHTML).to.equal('<o-input value="test"></o-input>');
		});

		it('should mask value on password input elements', () => {
			render(<input value="xyz" type="password" />);
			expect(scratch.innerHTML).to.equal('<input type="password">');
		});

		it('should unset href if null || undefined', () => {
			render(
				<pre>
					<a href="#">href="#"</a>
					<a href={undefined}>href="undefined"</a>
					<a href={null}>href="null"</a>
					<a href={''}>href="''"</a>
				</pre>
			);

			const links = scratch.querySelectorAll('a');
			expect(links[0].hasAttribute('href')).to.equal(true);
			expect(links[1].hasAttribute('href')).to.equal(false);
			expect(links[2].hasAttribute('href')).to.equal(false);
			expect(links[3].hasAttribute('href')).to.equal(true);
		});

		describe('dangerouslySetInnerHTML', () => {
			it('should support dangerouslySetInnerHTML', () => {
				let html = '<b>foo &amp; bar</b>';
				// eslint-disable-next-line react/no-danger
				render(<div dangerouslySetInnerHTML={{ __html: html }} />);

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
				render(<div dangerouslySetInnerHTML={{ __html: html }} />);
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

				render(<Thing html="<b><i>test</i></b>" />);
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

			it('should not mutative render with dangerouslySetInnerHTML', () => {
				// In other words, if render is called with a container with existing
				// children, dangerouslySetInnerHTML should leave the DOM intact

				let html = '<b>foo &amp; bar</b>';
				scratch.innerHTML = `<div>${html}</div>`;
				// eslint-disable-next-line react/no-danger
				render(<div dangerouslySetInnerHTML={{ __html: html }} />);

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
				render(<Thing ref={r => (thing = r)} />);

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

				render(<App />);
				expect(scratch.innerHTML).to.equal('<div></div>');

				set({ show: false });
				rerender();
				expect(scratch.innerHTML).to.equal('');
			});
		});

		it('should reconcile mutated checked property', () => {
			let check = p => render(<input type="checkbox" checked={p} />),
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
				</div>
			);

			let a = scratch.firstChild.firstChild;
			let b = scratch.firstChild.lastChild;

			expect(a).to.have.property('nodeName', 'A');
			expect(b).to.have.property('nodeName', 'B');

			render(
				<div>
					<b>b</b>
					<a>a</a>
				</div>
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
					sortAttributes(
						'<input type="range" min="0" max="100" list="steplist">'
					)
				);
			});
		}

		// Issue #2284
		it('should not throw when setting size to an invalid value', () => {
			// These values are usually used to reset the `size` attribute to its
			// initial state.
			expect(() => render(<input size={undefined} />)).to.not.throw();
			expect(() => render(<input size={null} />)).to.not.throw();
			expect(() => render(<input size={0} />)).to.not.throw();
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
							<input
								value={text}
								onInput={this.setText}
								ref={i => (input = i)}
							/>
						</div>
					);
				}
			}

			render(<TodoList />);

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
			render(<input value={undefined} />);
			scratch.firstChild.value = 'foo';
			render(<input value={undefined} />);
			expect(scratch.firstChild.value).to.equal('foo');
		});

		it('should keep value of uncontrolled checkboxes', () => {
			render(<input type="checkbox" checked={undefined} />);
			scratch.firstChild.checked = true;
			render(<input type="checkbox" checked={undefined} />);
			expect(scratch.firstChild.checked).to.equal(true);
		});

		// #2756
		it('should set progress value to 0', () => {
			render(<progress value={0} max="100" />);
			expect(scratch.firstChild.value).to.equal(0);
			expect(scratch.firstChild.getAttribute('value')).to.equal('0');
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

			render(<Inputs ref={x => (inputs = x)} />);

			expect(text.value).to.equal('Hello');
			expect(checkbox.checked).to.equal(true);

			text.value = 'World';
			checkbox.checked = false;

			inputs.forceUpdate();
			rerender();

			expect(text.value).to.equal('Hello');
			expect(checkbox.checked).to.equal(true);
		});

		it('should always diff `contenteditable` `innerHTML` against the DOM', () => {
			// This tests that we do not cause any cursor jumps in contenteditable fields
			// See https://github.com/preactjs/preact/issues/2691

			function Editable() {
				const [value, setValue] = useState('Hello');

				return (
					<div
						contentEditable
						dangerouslySetInnerHTML={{ __html: value }}
						onInput={e => setValue(e.currentTarget.innerHTML)}
					/>
				);
			}

			render(<Editable />);

			let editable = scratch.querySelector('[contenteditable]');

			// modify the innerHTML and set the caret to character 2 to simulate a user typing
			editable.innerHTML = 'World';

			const range = document.createRange();
			range.selectNodeContents(editable);
			range.setStart(editable.childNodes[0], 2);
			range.collapse(true);
			const sel = window.getSelection();
			sel.removeAllRanges();
			sel.addRange(range);

			// ensure we didn't mess up setting the cursor to position 2
			expect(window.getSelection().getRangeAt(0).startOffset).to.equal(2);

			// dispatch the input event to tell preact to re-render
			editable.dispatchEvent(createEvent('input'));
			rerender();

			// ensure innerHTML is still correct (was not an issue before) and
			// more importantly the caret is still at character 2
			editable = scratch.querySelector('[contenteditable]');
			expect(editable.innerHTML).to.equal('World');
			expect(window.getSelection().getRangeAt(0).startOffset).to.equal(2);
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

			render(<App />);
			expect(scratch.innerHTML).to.equal(
				'<div><h1 class="fade-down">Hi</h1></div>'
			);
			clearLog();

			updateState();
			rerender();

			expect(scratch.innerHTML).to.equal(
				'<div><h1 class="fade-down">Hi, friend</h1></div>'
			);
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

			render(<App />);

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

			render(<App />);
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

			render(<App>10</App>);
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

			render(<A />);
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

			render(<App />);
			expect(serializeHtml(scratch)).to.equal('<div><span>Bye</span></div>');
		});

		it('should remove class attributes', () => {
			const App = props => (
				<div className={props.class}>
					<span>Bye</span>
				</div>
			);

			render(<App class="hi" />);
			expect(scratch.innerHTML).to.equal(
				'<div class="hi"><span>Bye</span></div>'
			);

			render(<App />);
			expect(serializeHtml(scratch)).to.equal('<div><span>Bye</span></div>');
		});

		it('should not read DOM attributes on render without existing DOM', () => {
			const attributesSpy = spyOnElementAttributes();
			render(
				<div id="wrapper">
					<div id="page1">Page 1</div>
				</div>
			);
			expect(scratch.innerHTML).to.equal(
				'<div id="wrapper"><div id="page1">Page 1</div></div>'
			);

			// IE11 doesn't allow modifying Element.prototype functions properly.
			// Custom spies will never be called.
			if (!isIE11) {
				expect(attributesSpy.get).to.not.have.been.called;
			}

			render(
				<div id="wrapper">
					<div id="page2">Page 2</div>
				</div>
			);
			expect(scratch.innerHTML).to.equal(
				'<div id="wrapper"><div id="page2">Page 2</div></div>'
			);

			// IE11 doesn't allow modifying Element.prototype functions properly.
			// Custom spies will never be called.
			if (!isIE11) {
				expect(attributesSpy.get).to.not.have.been.called;
			}
		});

		// #2926
		it('should not throw when changing contentEditable to undefined or null', () => {
			render(<p contentEditable>foo</p>);

			expect(() =>
				render(<p contentEditable={undefined}>foo</p>)
			).to.not.throw();
			expect(scratch.firstChild.contentEditable).to.equal('inherit');

			expect(() => render(<p contentEditable={null}>foo</p>)).to.not.throw();
			expect(scratch.firstChild.contentEditable).to.equal('inherit');
		});

		// #2926 Part 2
		it('should allow setting contentEditable to false', () => {
			render(
				<div contentEditable>
					<span>editable</span>
					<p contentEditable={false}>not editable</p>
				</div>
			);

			expect(scratch.firstChild.contentEditable).to.equal('true');
			expect(scratch.querySelector('p').contentEditable).to.equal('false');
		});

		// #3060
		it('should reset tabindex on undefined/null', () => {
			const defaultValue = isIE11 ? 0 : -1;

			render(<div tabIndex={0} />);
			expect(scratch.firstChild.tabIndex).to.equal(0);
			render(<div tabIndex={undefined} />);
			expect(scratch.firstChild.tabIndex).to.equal(defaultValue);
			render(<div tabIndex={null} />);
			expect(scratch.firstChild.tabIndex).to.equal(defaultValue);

			render(<div tabindex={0} />);
			expect(scratch.firstChild.tabIndex).to.equal(0);
			render(<div tabindex={undefined} />);
			expect(scratch.firstChild.tabIndex).to.equal(defaultValue);
			render(<div tabindex={null} />);
			expect(scratch.firstChild.tabIndex).to.equal(defaultValue);
		});

		it('should only remove the highest parent when unmounting a tree of DOM', () => {
			render(
				<ul>
					<li>Hello</li>
					<li>World</li>
				</ul>
			);

			clearLog();
			render(null);

			expect(getLog()).to.deep.equal(['<ul>HelloWorld.remove()']);
		});

		it('should only remove the highest parent when unmounting a tree with components', () => {
			const List = props => props.children;
			const Item = props => <li>{props.children}</li>;
			render(
				<ul>
					<List>
						<Item>Hello</Item>
						<Item>World</Item>
					</List>
				</ul>
			);

			const items = scratch.querySelectorAll('li');

			clearLog();
			render(null);

			expect(getLog()).to.deep.equal(['<ul>HelloWorld.remove()']);

			expect(items[0]).to.have.property('parentNode').that.should.exist;
			expect(items[1]).to.have.property('parentNode').that.should.exist;
		});
	});

	describe('hydrate', () => {
		/** @type {HTMLElement} */
		let scratch;
		let attributesSpy;
		let hydrate;

		const List = ({ children }) => <ul>{children}</ul>;
		const ListItem = ({ children, onClick = null }) => (
			<li onClick={onClick}>{children}</li>
		);

		let resetAppendChild;
		let resetInsertBefore;
		let resetRemoveChild;
		let resetRemove;
		let resetSetAttribute;
		let resetRemoveAttribute;

		before(() => {
			resetAppendChild = logCall(Element.prototype, 'appendChild');
			resetInsertBefore = logCall(Element.prototype, 'insertBefore');
			resetRemoveChild = logCall(Element.prototype, 'removeChild');
			resetRemove = logCall(Element.prototype, 'remove');
			resetSetAttribute = logCall(Element.prototype, 'setAttribute');
			resetRemoveAttribute = logCall(Element.prototype, 'removeAttribute');
		});

		after(() => {
			resetAppendChild();
			resetInsertBefore();
			resetRemoveChild();
			resetRemove();
			resetSetAttribute();
			resetRemoveAttribute();
			if (Element.prototype.addEventListener.restore)
				Element.prototype.addEventListener.restore();
		});

		beforeEach(() => {
			scratch = setupScratch();
			attributesSpy = spyOnElementAttributes();
			hydrate = createRoot(scratch).hydrate;
		});

		afterEach(() => {
			teardown(scratch);
			clearLog();
		});

		it('should reuse existing DOM', () => {
			const onClickSpy = sinon.spy();
			const html = ul([li('1'), li('2'), li('3')]);

			scratch.innerHTML = html;
			clearLog();

			hydrate(
				<ul>
					<li>1</li>
					<li>2</li>
					<li onClick={onClickSpy}>3</li>
				</ul>,
				scratch
			);

			expect(scratch.innerHTML).to.equal(html);
			expect(getLog()).to.deep.equal([]);
			expect(onClickSpy).not.to.have.been.called;

			scratch
				.querySelector('li:last-child')
				.dispatchEvent(createEvent('click'));

			expect(onClickSpy).to.have.been.called.calledOnce;
		});

		it('should reuse existing DOM when given components', () => {
			const onClickSpy = sinon.spy();
			const html = ul([li('1'), li('2'), li('3')]);

			scratch.innerHTML = html;
			clearLog();

			hydrate(
				<List>
					<ListItem>1</ListItem>
					<ListItem>2</ListItem>
					<ListItem onClick={onClickSpy}>3</ListItem>
				</List>,
				scratch
			);

			expect(scratch.innerHTML).to.equal(html);
			expect(getLog()).to.deep.equal([]);
			expect(onClickSpy).not.to.have.been.called;

			scratch
				.querySelector('li:last-child')
				.dispatchEvent(createEvent('click'));

			expect(onClickSpy).to.have.been.called.calledOnce;
		});

		it('should properly set event handlers to existing DOM when given components', () => {
			const proto = Element.prototype;
			sinon.spy(proto, 'addEventListener');

			const clickHandlers = [sinon.spy(), sinon.spy(), sinon.spy()];

			const html = ul([li('1'), li('2'), li('3')]);

			scratch.innerHTML = html;
			clearLog();

			hydrate(
				<List>
					<ListItem onClick={clickHandlers[0]}>1</ListItem>
					<ListItem onClick={clickHandlers[1]}>2</ListItem>
					<ListItem onClick={clickHandlers[2]}>3</ListItem>
				</List>,
				scratch
			);

			expect(scratch.innerHTML).to.equal(html);
			expect(getLog()).to.deep.equal([]);
			expect(proto.addEventListener).to.have.been.calledThrice;
			expect(clickHandlers[2]).not.to.have.been.called;

			scratch
				.querySelector('li:last-child')
				.dispatchEvent(createEvent('click'));
			expect(clickHandlers[2]).to.have.been.calledOnce;
		});

		it('should add missing nodes to existing DOM when hydrating', () => {
			const html = ul([li('1')]);

			scratch.innerHTML = html;
			clearLog();

			hydrate(
				<List>
					<ListItem>1</ListItem>
					<ListItem>2</ListItem>
					<ListItem>3</ListItem>
				</List>,
				scratch
			);

			expect(scratch.innerHTML).to.equal(ul([li('1'), li('2'), li('3')]));
			expect(getLog()).to.deep.equal([
				'<li>.insertBefore(#text, Null)',
				'<ul>1.insertBefore(<li>2, Null)',
				'<li>.insertBefore(#text, Null)',
				'<ul>12.insertBefore(<li>3, Null)'
			]);
		});

		it('should remove extra nodes from existing DOM when hydrating', () => {
			const html = ul([li('1'), li('2'), li('3'), li('4')]);

			scratch.innerHTML = html;
			clearLog();

			hydrate(
				<List>
					<ListItem>1</ListItem>
					<ListItem>2</ListItem>
					<ListItem>3</ListItem>
				</List>,
				scratch
			);

			expect(scratch.innerHTML).to.equal(ul([li('1'), li('2'), li('3')]));
			expect(getLog()).to.deep.equal(['<li>4.remove()']);
		});

		it('should not update attributes on existing DOM', () => {
			scratch.innerHTML =
				'<div><span before-hydrate="test" same-value="foo" different-value="a">Test</span></div>';
			let vnode = (
				<div>
					<span same-value="foo" different-value="b" new-value="c">
						Test
					</span>
				</div>
			);

			clearLog();
			hydrate(vnode, scratch);

			// IE11 doesn't support spying on Element.prototype
			if (!/Trident/.test(navigator.userAgent)) {
				expect(attributesSpy.get).to.not.have.been.called;
			}

			expect(serializeHtml(scratch)).to.equal(
				sortAttributes(
					'<div><span before-hydrate="test" different-value="a" same-value="foo">Test</span></div>'
				)
			);
			expect(getLog()).to.deep.equal([]);
		});

		it('should update class attribute via className prop', () => {
			scratch.innerHTML = '<div class="foo">bar</div>';
			hydrate(<div className="foo">bar</div>, scratch);
			expect(scratch.innerHTML).to.equal('<div class="foo">bar</div>');
		});

		it('should correctly hydrate with Fragments', () => {
			const html = ul([li('1'), li('2'), li('3'), li('4')]);

			scratch.innerHTML = html;
			clearLog();

			const clickHandlers = [
				sinon.spy(),
				sinon.spy(),
				sinon.spy(),
				sinon.spy()
			];

			hydrate(
				<List>
					<ListItem onClick={clickHandlers[0]}>1</ListItem>
					<Fragment>
						<ListItem onClick={clickHandlers[1]}>2</ListItem>
						<ListItem onClick={clickHandlers[2]}>3</ListItem>
					</Fragment>
					<ListItem onClick={clickHandlers[3]}>4</ListItem>
				</List>,
				scratch
			);

			expect(scratch.innerHTML).to.equal(html);
			expect(getLog()).to.deep.equal([]);
			expect(clickHandlers[2]).not.to.have.been.called;

			scratch
				.querySelector('li:nth-child(3)')
				.dispatchEvent(createEvent('click'));

			expect(clickHandlers[2]).to.have.been.called.calledOnce;
		});

		it('should correctly hydrate root Fragments', () => {
			const html = [
				ul([li('1'), li('2'), li('3'), li('4')]),
				div('sibling')
			].join('');

			scratch.innerHTML = html;
			clearLog();

			const clickHandlers = [
				sinon.spy(),
				sinon.spy(),
				sinon.spy(),
				sinon.spy(),
				sinon.spy()
			];

			hydrate(
				<Fragment>
					<List>
						<Fragment>
							<ListItem onClick={clickHandlers[0]}>1</ListItem>
							<ListItem onClick={clickHandlers[1]}>2</ListItem>
						</Fragment>
						<ListItem onClick={clickHandlers[2]}>3</ListItem>
						<ListItem onClick={clickHandlers[3]}>4</ListItem>
					</List>
					<div onClick={clickHandlers[4]}>sibling</div>
				</Fragment>,
				scratch
			);

			expect(scratch.innerHTML).to.equal(html);
			expect(getLog()).to.deep.equal([]);
			expect(clickHandlers[2]).not.to.have.been.called;

			scratch
				.querySelector('li:nth-child(3)')
				.dispatchEvent(createEvent('click'));

			expect(clickHandlers[2]).to.have.been.calledOnce;
			expect(clickHandlers[4]).not.to.have.been.called;

			scratch.querySelector('div').dispatchEvent(createEvent('click'));

			expect(clickHandlers[2]).to.have.been.calledOnce;
			expect(clickHandlers[4]).to.have.been.calledOnce;
		});

		// Failing because the following condition in mountDomElement doesn't evaluate to true
		// when hydrating a dom node which is not correct
		//		dom===d && newVNode.text!==oldVNode.text
		// We don't set `d` when hydrating. If we did, then newVNode.text would never equal
		// oldVNode.text since oldVNode is always EMPTY_OBJ when hydrating
		it.skip('should override incorrect pre-existing DOM with VNodes passed into render', () => {
			const initialHtml = [
				div('sibling'),
				ul([li('1'), li('4'), li('3'), li('2')])
			].join('');

			scratch.innerHTML = initialHtml;
			clearLog();

			hydrate(
				<Fragment>
					<List>
						<Fragment>
							<ListItem>1</ListItem>
							<ListItem>2</ListItem>
						</Fragment>
						<ListItem>3</ListItem>
						<ListItem>4</ListItem>
					</List>
					<div>sibling</div>
				</Fragment>,
				scratch
			);

			const finalHtml = [
				ul([li('1'), li('2'), li('3'), li('4')]),
				div('sibling')
			].join('');

			expect(scratch.innerHTML).to.equal(finalHtml);
			// TODO: Fill in with proper log once this test is passing
			expect(getLog()).to.deep.equal([]);
		});

		it('should not merge attributes with node created by the DOM', () => {
			const html = htmlString => {
				const div = document.createElement('div');
				div.innerHTML = htmlString;
				return div.firstChild;
			};

			// prettier-ignore
			const DOMElement = html`<div><a foo="bar"></a></div>`;
			scratch.appendChild(DOMElement);

			const preactElement = (
				<div>
					<a />
				</div>
			);

			hydrate(preactElement, scratch);
			// IE11 doesn't support spies on built-in prototypes
			if (!/Trident/.test(navigator.userAgent)) {
				expect(attributesSpy.get).to.not.have.been.called;
			}
			expect(scratch).to.have.property(
				'innerHTML',
				'<div><a foo="bar"></a></div>'
			);
		});

		it('should attach event handlers', () => {
			let spy = sinon.spy();
			scratch.innerHTML = '<span>Test</span>';
			let vnode = <span onClick={spy}>Test</span>;

			hydrate(vnode, scratch);

			scratch.firstChild.click();
			expect(spy).to.be.calledOnce;
		});

		// #2237
		it('should not redundantly add text nodes', () => {
			scratch.innerHTML = '<div id="test"><p>hello bar</p></div>';
			const element = document.getElementById('test');
			const Component = props => <p>hello {props.foo}</p>;

			hydrate(<Component foo="bar" />, element);
			expect(element.innerHTML).to.equal('<p>hello bar</p>');
		});

		it('should not remove values', () => {
			scratch.innerHTML =
				'<select><option value="0">Zero</option><option selected value="2">Two</option></select>';
			const App = () => {
				const options = [
					{
						value: '0',
						label: 'Zero'
					},
					{
						value: '2',
						label: 'Two'
					}
				];

				return (
					<select value="2">
						{options.map(({ disabled, label, value }) => (
							<option key={label} disabled={disabled} value={value}>
								{label}
							</option>
						))}
					</select>
				);
			};

			hydrate(<App />, scratch);
			expect(sortAttributes(scratch.innerHTML)).to.equal(
				sortAttributes(
					'<select><option value="0">Zero</option><option selected="" value="2">Two</option></select>'
				)
			);
		});

		it('should deopt for trees introduced in hydrate (append)', () => {
			scratch.innerHTML = '<div id="test"><p class="hi">hello bar</p></div>';
			const Component = props => <p class="hi">hello {props.foo}</p>;
			const element = document.getElementById('test');
			hydrate = createRoot(element).hydrate;
			hydrate(
				<Fragment>
					<Component foo="bar" />
					<Component foo="baz" />
				</Fragment>
			);
			expect(element.innerHTML).to.equal(
				'<p class="hi">hello bar</p><p class="hi">hello baz</p>'
			);
		});

		it('should deopt for trees introduced in hydrate (insert before)', () => {
			scratch.innerHTML = '<div id="test"><p class="hi">hello bar</p></div>';
			const Component = props => <p class="hi">hello {props.foo}</p>;
			const element = document.getElementById('test');
			hydrate = createRoot(element).hydrate;
			hydrate(
				<Fragment>
					<Component foo="baz" />
					<Component foo="bar" />
				</Fragment>
			);
			expect(element.innerHTML).to.equal(
				'<p class="hi">hello baz</p><p class="hi">hello bar</p>'
			);
		});

		it('should skip comment nodes between text nodes', () => {
			scratch.innerHTML = '<p>hello <!-- c -->foo</p>';
			hydrate(<p>hello {'foo'}</p>, scratch);
			expect(scratch.innerHTML).to.equal('<p>hello foo</p>');
		});

		it('should skip comment nodes between dom nodes', () => {
			scratch.innerHTML = '<p><i>0</i><!-- c --><b>1</b></p>';
			hydrate(
				<p>
					<i>0</i>
					<b>1</b>
				</p>,
				scratch
			);
			expect(scratch.innerHTML).to.equal('<p><i>0</i><b>1</b></p>');
		});

		it('should not hydrate with dangerouslySetInnerHTML', () => {
			let html = '<b>foo &amp; bar</b>';
			scratch.innerHTML = `<div>${html}</div>`;

			clearLog();

			// eslint-disable-next-line react/no-danger
			hydrate(<div dangerouslySetInnerHTML={{ __html: html }} />, scratch);

			expect(scratch.firstChild).to.have.property('innerHTML', html);
			expect(scratch.innerHTML).to.equal(`<div>${html}</div>`);
			expect(getLog()).to.deep.equal([]);
		});
	});

	describe('root', () => {
		/** @type {HTMLElement} */
		let scratch;
		let root;

		beforeEach(() => {
			scratch = setupScratch();
			root = createRoot(scratch);
		});

		afterEach(() => {
			teardown(scratch);
		});

		it('can reuse a root', () => {
			root.render(
				<p>
					<i>0</i>
					<b>1</b>
				</p>
			);

			expect(scratch.innerHTML).to.equal('<p><i>0</i><b>1</b></p>');

			root.render(
				<div>
					<i>0</i>
					<b>1</b>
				</div>
			);
			expect(scratch.innerHTML).to.equal('<div><i>0</i><b>1</b></div>');
		});
	});
});
