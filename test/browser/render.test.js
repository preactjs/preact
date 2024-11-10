import { setupRerender } from 'preact/test-utils';
import { createElement, render, Component, options, Fragment } from 'preact';
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

/** @jsx createElement */

function getAttributes(node) {
	let attrs = {};
	for (let i = node.attributes.length; i--; ) {
		attrs[node.attributes[i].name] = node.attributes[i].value;
	}
	return attrs;
}

const isIE11 = /Trident\//.test(navigator.userAgent);

describe('render()', () => {
	let scratch, rerender;

	let resetAppendChild;
	let resetInsertBefore;
	let resetRemoveText;
	let resetRemove;

	beforeEach(() => {
		scratch = setupScratch();
		rerender = setupRerender();
	});

	afterEach(() => {
		teardown(scratch);
	});

	before(() => {
		resetAppendChild = logCall(Element.prototype, 'appendChild');
		resetInsertBefore = logCall(Element.prototype, 'insertBefore');
		resetRemoveText = logCall(Text.prototype, 'remove');
		resetRemove = logCall(Element.prototype, 'remove');
	});

	after(() => {
		resetAppendChild();
		resetInsertBefore();
		resetRemoveText();
		resetRemove();
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

	it('should render % width and height on img correctly', () => {
		render(<img width="100%" height="100%" />, scratch);
		expect(scratch.innerHTML).to.eql(`<img width="100%" height="100%">`);
	});

	// IE11 doesn't support these.
	if (!/Trident/.test(window.navigator.userAgent)) {
		it('should render px width and height on img correctly', () => {
			render(<img width="100px" height="100px" />, scratch);
			expect(scratch.innerHTML).to.eql(`<img width="100px" height="100px">`);
		});
	}

	it('should support the <template> tag', () => {
		function App() {
			return (
				<template>
					<h1>it works</h1>
				</template>
			);
		}

		render(<App />, scratch);
		const clone = scratch.firstChild.content.cloneNode(true);
		expect(clone.firstChild.outerHTML).to.eql('<h1>it works</h1>');
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

	it('should support the translate attribute w/ false as a boolean', () => {
		render(<b translate={false}>Bold</b>, scratch);
		expect(scratch.innerHTML).to.equal('<b translate="no">Bold</b>');
	});

	it('should support the translate attribute w/ true as a boolean', () => {
		render(<b translate>Bold</b>, scratch);
		expect(scratch.innerHTML).to.equal('<b translate="yes">Bold</b>');
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

	it('should not render children when rerendering a function child', () => {
		const icon = () => {};

		render(<div>{icon}</div>, scratch);
		expect(scratch.innerHTML).to.equal('<div></div>');

		render(<div>{icon}</div>, scratch);
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

	it('should render bigint as text content', () => {
		// Skip in browsers not supporting big integers
		if (typeof BigInt === 'undefined') {
			return;
		}

		// eslint-disable-next-line no-undef, new-cap
		render(BigInt(4), scratch);
		expect(scratch.innerHTML).to.equal('4');
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

	// Test for #3969
	it('should clear rowspan and colspan', () => {
		/** @type {(v) => void} */
		let update;
		class App extends Component {
			constructor(props) {
				super(props);
				this.state = { active: true };
				update = this.setState.bind(this);
			}

			render() {
				return (
					<div>
						{this.state.active ? (
							<table>
								<tr>
									<td rowSpan={2} colSpan={2}>
										Foo
									</td>
								</tr>
							</table>
						) : (
							<table>
								<tr>
									<td>Foo</td>
								</tr>
							</table>
						)}
					</div>
				);
			}
		}

		render(<App />, scratch);

		update({ active: false });
		rerender();

		expect(scratch.querySelector('td[rowspan]')).to.equal(null);
		expect(scratch.querySelector('td[colspan]')).to.equal(null);
	});

	// Test for preactjs/preact#651
	it('should set enumerable boolean attribute', () => {
		render(<input spellcheck={false} />, scratch);
		expect(scratch.firstChild.spellcheck).to.equal(false);
	});

	it('should support popover auto', () => {
		render(<div popover="auto" />, scratch);
		expect(scratch.innerHTML).to.equal('<div popover="auto"></div>');
	});

	it('should support popover true boolean', () => {
		render(<div popover />, scratch);
		expect(scratch.innerHTML).to.equal('<div popover=""></div>');
	});

	it('should support popover false boolean', () => {
		render(<div popover={false} />, scratch);
		expect(scratch.innerHTML).to.equal('<div></div>');
	});

	// Test for preactjs/preact#4340
	it('should respect defaultValue in render', () => {
		scratch.innerHTML = '<input value="foo">';
		render(<input defaultValue="foo" />, scratch);
		expect(scratch.firstChild.value).to.equal('foo');
	});

	it('should support subsequent renders w/ defaultValue', () => {
		scratch.innerHTML = '<input value="foo">';
		render(<input defaultValue="foo" value="bar" />, scratch);
		expect(scratch.firstChild.value).to.equal('bar');
		render(<input defaultValue="foo" value="baz" />, scratch);
		expect(scratch.firstChild.value).to.equal('baz');
	});

	it('should respect defaultChecked in render', () => {
		scratch.innerHTML = '<input checked="true">';
		render(<input defaultChecked />, scratch);
		expect(scratch.firstChild.checked).to.equal(true);
	});

	it('should support subsequent renders w/ defaultChecked', () => {
		scratch.innerHTML = '<input checked="true">';
		render(<input defaultChecked checked />, scratch);
		expect(scratch.firstChild.checked).to.equal(true);
		render(<input defaultChecked checked={false} />, scratch);
		expect(scratch.firstChild.checked).to.equal(false);
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

	it('should support false string aria-* attributes', () => {
		render(<div aria-checked="false" />, scratch);
		expect(scratch.firstChild.getAttribute('aria-checked')).to.equal('false');
	});

	it('should support false aria-* attributes', () => {
		render(<div aria-checked={false} />, scratch);
		expect(scratch.firstChild.getAttribute('aria-checked')).to.equal('false');
	});

	it('should support false data-* attributes', () => {
		render(<div data-checked={false} />, scratch);
		expect(scratch.firstChild.getAttribute('data-checked')).to.equal('false');
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

	it('should unset href if null || undefined', () => {
		render(
			<pre>
				<a href="#">href="#"</a>
				<a href={undefined}>href="undefined"</a>
				<a href={null}>href="null"</a>
				<a href={''}>href="''"</a>
			</pre>,
			scratch
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
			/** @type {Component} */
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

			/** @type {Component} */
			let thing;
			render(<Thing ref={r => (thing = r)} />, scratch);

			let firstInnerHTMLChild = scratch.firstChild.firstChild;

			// Re-render
			thing.forceUpdate();

			expect(firstInnerHTMLChild).to.equalNode(scratch.firstChild.firstChild);
		});

		it('should unmount dangerouslySetInnerHTML', () => {
			/** @type {(v) => void} */
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
		/** @type {(v) => void} */
		let setText;
		/** @type {(v) => void} */
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

	// #2756
	it('should set progress value to 0', () => {
		render(<progress value={0} max="100" />, scratch);
		expect(scratch.firstChild.value).to.equal(0);
		expect(scratch.firstChild.getAttribute('value')).to.equal('0');
	});

	// #4487
	it('should not set value for undefined/null on a progress element', () => {
		render(<progress value={undefined} />, scratch);
		expect(scratch.firstChild.getAttribute('value')).to.equal(null);
		render(<progress value={null} />, scratch);
		expect(scratch.firstChild.getAttribute('value')).to.equal(null);
		render(<progress value={0} />, scratch);
		expect(scratch.firstChild.getAttribute('value')).to.equal('0');
		render(<progress value={50} />, scratch);
		expect(scratch.firstChild.getAttribute('value')).to.equal('50');
		render(<progress value={null} />, scratch);
		expect(scratch.firstChild.getAttribute('value')).to.equal(null);
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

		render(<Editable />, scratch);

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
		/** @type {() => void} */
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
		/** @type {() => void} */
		let updateApp;
		class App extends Component {
			render() {
				updateApp = () => this.forceUpdate();
				return <Parent />;
			}
		}

		/** @type {() => void} */
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
		/** @type {() => void} */
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

	it('should not remove iframe', () => {
		/** @type {(v) => void} */
		let setState;
		const Iframe = () => {
			// oxlint-disable-next-line iframe-missing-sandbox
			return <iframe src="https://codesandbox.io/s/runtime-silence-no4zx" />;
		};

		const Test2 = () => <div>Test2</div>;
		const Test3 = () => <div>Test3</div>;

		class App extends Component {
			constructor(props) {
				super(props);
				this.state = { value: true };
				setState = this.setState.bind(this);
			}

			render(props, state) {
				return (
					<div>
						{state.value ? <Test3 /> : null}
						{state.value ? <Test2 /> : null}
						<Iframe key="iframe" />
					</div>
				);
			}
		}

		render(<App />, scratch);

		expect(scratch.innerHTML).to.equal(
			'<div><div>Test3</div><div>Test2</div><iframe src="https://codesandbox.io/s/runtime-silence-no4zx"></iframe></div>'
		);
		clearLog();
		setState({ value: false });
		rerender();

		expect(scratch.innerHTML).to.equal(
			'<div><iframe src="https://codesandbox.io/s/runtime-silence-no4zx"></iframe></div>'
		);
		expect(getLog()).to.deep.equal([
			'<div>Test3.remove()',
			'<div>Test2.remove()'
		]);
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
		/** @type {A} */
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

		// IE11 doesn't allow modifying Element.prototype functions properly.
		// Custom spies will never be called.
		if (!isIE11) {
			expect(attributesSpy.get).to.not.have.been.called;
		}

		render(
			<div id="wrapper">
				<div id="page2">Page 2</div>
			</div>,
			scratch
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
		render(<p contentEditable>foo</p>, scratch);

		expect(() =>
			render(<p contentEditable={undefined}>foo</p>, scratch)
		).to.not.throw();
		expect(scratch.firstChild.contentEditable).to.equal('inherit');

		expect(() =>
			render(<p contentEditable={null}>foo</p>, scratch)
		).to.not.throw();
		expect(scratch.firstChild.contentEditable).to.equal('inherit');
	});

	// #2926 Part 2
	it('should allow setting contentEditable to false', () => {
		render(
			<div contentEditable>
				<span>editable</span>
				<p contentEditable={false}>not editable</p>
			</div>,
			scratch
		);

		expect(scratch.firstChild.contentEditable).to.equal('true');
		expect(scratch.querySelector('p').contentEditable).to.equal('false');
	});

	// #3060
	it('should reset tabindex on undefined/null', () => {
		const defaultValue = isIE11 ? 0 : -1;

		render(<div tabIndex={0} />, scratch);
		expect(scratch.firstChild.tabIndex).to.equal(0);
		render(<div tabIndex={undefined} />, scratch);
		expect(scratch.firstChild.tabIndex).to.equal(defaultValue);
		render(<div tabIndex={null} />, scratch);
		expect(scratch.firstChild.tabIndex).to.equal(defaultValue);

		render(<div tabindex={0} />, scratch);
		expect(scratch.firstChild.tabIndex).to.equal(0);
		render(<div tabindex={undefined} />, scratch);
		expect(scratch.firstChild.tabIndex).to.equal(defaultValue);
		render(<div tabindex={null} />, scratch);
		expect(scratch.firstChild.tabIndex).to.equal(defaultValue);
	});

	// #4137
	it('should unset role if null || undefined', () => {
		render(
			<section>
				<div role="status">role="status"</div>
				<div role={undefined}>role="undefined"</div>
				<div role={null}>role="null"</div>
			</section>,
			scratch
		);

		const divs = scratch.querySelectorAll('div');
		expect(divs[0].hasAttribute('role')).to.equal(true);
		expect(divs[1].hasAttribute('role')).to.equal(false);
		expect(divs[2].hasAttribute('role')).to.equal(false);
	});

	it('should not crash or repeatedly add the same child when replacing a matched vnode with null', () => {
		const B = () => <div>B</div>;

		/** @type {() => void} */
		let update;
		class App extends Component {
			constructor(props) {
				super(props);
				this.state = { show: true };
				update = () => {
					this.setState(state => ({ show: !state.show }));
				};
			}

			render() {
				if (this.state.show) {
					return (
						<div>
							<B />
							<div />
						</div>
					);
				}
				return (
					<div>
						<div />
						{null}
						<B />
					</div>
				);
			}
		}

		render(<App />, scratch);
		expect(scratch.innerHTML).to.equal('<div><div>B</div><div></div></div>');

		update();
		rerender();
		expect(scratch.innerHTML).to.equal('<div><div></div><div>B</div></div>');

		update();
		rerender();
		expect(scratch.innerHTML).to.equal('<div><div>B</div><div></div></div>');

		update();
		rerender();
		expect(scratch.innerHTML).to.equal('<div><div></div><div>B</div></div>');
	});

	it('should reconcile children in right order', () => {
		let data = ['A', 'B', 'C', 'D', 'E'];
		render(
			<ul>
				{data.map(d => (
					<li key={d}>{d}</li>
				))}
			</ul>,
			scratch
		);

		expect(scratch.textContent).to.equal('ABCDE');

		data = ['B', 'E', 'C', 'D'];
		render(
			<ul>
				{data.map(d => (
					<li key={d}>{d}</li>
				))}
			</ul>,
			scratch
		);
		expect(scratch.textContent).to.equal('BECD');
	});

	it('should reconcile children in right order #2', () => {
		let data = ['A', 'B', 'C', 'D', 'E'];
		render(
			<ul>
				{data.map(d => (
					<li key={d}>{d}</li>
				))}
			</ul>,
			scratch
		);

		expect(scratch.textContent).to.equal('ABCDE');

		data = ['B', 'E', 'D', 'C'];
		render(
			<ul>
				{data.map(d => (
					<li key={d}>{d}</li>
				))}
			</ul>,
			scratch
		);
		expect(scratch.textContent).to.equal('BEDC');
	});

	it('should reconcile children in right order #3', () => {
		render(
			<div>
				<p>_A1</p>
				<p>_A2</p>
				<h2>_A3</h2>
				<p>_A4</p>
				<h2>_A5</h2>
				<p>_A6</p>
				<h2>_A7</h2>
				<p>_A8</p>
			</div>,
			scratch
		);

		render(
			<div>
				<p>_B1</p>
				<p>_B2</p>
				<p>_B3</p>
				<h2>_B4</h2>
				<p>_B5</p>
				<p>_B6</p>
				<h2>_B7</h2>
				<p>_B8</p>
			</div>,
			scratch
		);

		expect(serializeHtml(scratch)).to.equal(
			'<div><p>_B1</p><p>_B2</p><p>_B3</p><h2>_B4</h2><p>_B5</p><p>_B6</p><h2>_B7</h2><p>_B8</p></div>'
		);
	});

	it('should reconcile children in right order #4', () => {
		render(
			<div>
				<p>_A1</p>
				<p>_A2</p>
				<div>_A3</div>
				<h2>_A4</h2>
				<p>_A5</p>
				<div>_A6</div>
				<h2>_A7</h2>
				<p>_A8</p>
				<div>_A9</div>
				<h2>_A10</h2>
				<p>_A11</p>
				<div>_A12</div>
			</div>,
			scratch
		);

		render(
			<div>
				<p>_B1</p>
				<p>_B2</p>
				<p>_B3</p>
				<h2>_B4</h2>
				<p>_B5</p>
				<p>_B6</p>
				<p>_B7</p>
				<h2>_B8</h2>
				<p>_B9</p>
				<p>_B10</p>
				<p>_B11</p>
				<p>_B12</p>
				<h2>_B13</h2>
			</div>,
			scratch
		);

		expect(serializeHtml(scratch)).to.equal(
			'<div><p>_B1</p><p>_B2</p><p>_B3</p><h2>_B4</h2><p>_B5</p><p>_B6</p><p>_B7</p><h2>_B8</h2><p>_B9</p><p>_B10</p><p>_B11</p><p>_B12</p><h2>_B13</h2></div>'
		);
	});

	it('should not crash or repeatedly add the same child when replacing a matched vnode with null (mixed dom-types)', () => {
		const B = () => <div>B</div>;

		/** @type {() => void} */
		let update;
		class App extends Component {
			constructor(props) {
				super(props);
				this.state = { show: true };
				update = () => {
					this.setState(state => ({ show: !state.show }));
				};
			}

			render() {
				if (this.state.show) {
					return (
						<div>
							<B />
							<div>C</div>
						</div>
					);
				}
				return (
					<div>
						<span>A</span>
						{null}
						<B />
						<div>C</div>
					</div>
				);
			}
		}

		render(<App />, scratch);
		expect(scratch.innerHTML).to.equal('<div><div>B</div><div>C</div></div>');

		update();
		rerender();
		expect(scratch.innerHTML).to.equal(
			'<div><span>A</span><div>B</div><div>C</div></div>'
		);

		update();
		rerender();
		expect(scratch.innerHTML).to.equal('<div><div>B</div><div>C</div></div>');

		update();
		rerender();
		expect(scratch.innerHTML).to.equal(
			'<div><span>A</span><div>B</div><div>C</div></div>'
		);
	});

	it('should shrink lists', () => {
		function RenderedItem({ item }) {
			if (item.renderAsNullInComponent) {
				return null;
			}

			return <div>{item.id}</div>;
		}

		function App({ list }) {
			return (
				<div>
					{list.map(item => (
						<RenderedItem key={item.id} item={item} />
					))}
				</div>
			);
		}

		const firstList = [
			{ id: 'One' },
			{ id: 'Two' },
			{ id: 'Three' },
			{ id: 'Four' }
		];

		const secondList = [
			{ id: 'One' },
			{ id: 'Four', renderAsNullInComponent: true },
			{ id: 'Six' },
			{ id: 'Seven' }
		];

		render(<App list={firstList} />, scratch);
		expect(scratch.innerHTML).to.equal(
			'<div><div>One</div><div>Two</div><div>Three</div><div>Four</div></div>'
		);

		render(<App list={secondList} />, scratch);
		expect(scratch.innerHTML).to.equal(
			'<div><div>One</div><div>Six</div><div>Seven</div></div>'
		);
	});

	it('handles shuffled child-ordering', function () {
		const App = ({ items }) => (
			<div>
				{items.map(key => (
					<div key={key}>{key}</div>
				))}
			</div>
		);
		const a = ['0', '1', '2', '3', '4', '5', '6'];
		const b = ['1', '3', '5', '2', '6', '4', '0'];
		const c = ['11', '3', '1', '4', '6', '2', '5', '0', '9', '10'];
		render(<App items={a} />, scratch);
		clearLog();
		expect(scratch.innerHTML).to.equal(
			`<div>${a.map(n => `<div>${n}</div>`).join('')}</div>`
		);

		render(<App items={b} />, scratch);
		expect(scratch.innerHTML).to.equal(
			`<div>${b.map(n => `<div>${n}</div>`).join('')}</div>`
		);
		expect(getLog()).to.deep.equal([
			'<div>0123456.insertBefore(<div>2, <div>6)',
			'<div>0134526.appendChild(<div>4)',
			'<div>0135264.appendChild(<div>0)'
		]);
		clearLog();

		render(<App items={c} />, scratch);
		expect(scratch.innerHTML).to.equal(
			`<div>${c.map(n => `<div>${n}</div>`).join('')}</div>`
		);
		expect(getLog()).to.deep.equal([
			'<div>.appendChild(#text)',
			'<div>1352640.insertBefore(<div>11, <div>1)',
			'<div>111352640.insertBefore(<div>1, <div>5)',
			'<div>113152640.insertBefore(<div>6, <div>0)',
			'<div>113152460.insertBefore(<div>2, <div>0)',
			'<div>113154620.insertBefore(<div>5, <div>0)',
			'<div>.appendChild(#text)',
			'<div>113146250.appendChild(<div>9)',
			'<div>.appendChild(#text)',
			'<div>1131462509.appendChild(<div>10)'
		]);
		clearLog();

		render(<App items={a} />, scratch);
		expect(scratch.innerHTML).to.equal(
			`<div>${a.map(n => `<div>${n}</div>`).join('')}</div>`
		);
		expect(getLog()).to.deep.equal([
			'<div>11.remove()',
			'<div>9.remove()',
			'<div>10.remove()',
			'<div>3146250.insertBefore(<div>0, <div>3)',
			'<div>0314625.insertBefore(<div>1, <div>3)',
			'<div>0134625.insertBefore(<div>2, <div>3)',
			'<div>0123465.insertBefore(<div>5, <div>6)'
		]);
		clearLog();
	});

	it('should shift keyed lists with wrapping fragment-like children', () => {
		const ItemA = ({ text }) => <div>A: {text}</div>;
		const ItemB = ({ text }) => <div>B: {text}</div>;

		const Item = ({ text, type }) => {
			return type === 'B' ? <ItemB text={text} /> : <ItemA text={text} />;
		};

		let set;
		class App extends Component {
			constructor(props) {
				super(props);
				this.state = { items: a, mapping: mappingA };
				set = (items, mapping) => {
					this.setState({ items, mapping });
				};
			}

			render() {
				return (
					<ul>
						{this.state.items.map((key, i) => (
							<Item key={key} type={this.state.mapping[i]} text={key} />
						))}
					</ul>
				);
			}
		}

		const a = ['4', '1', '2', '3'];
		const mappingA = ['A', 'A', 'B', 'B'];
		const b = ['1', '2', '4', '3'];
		const mappingB = ['B', 'A', 'A', 'A'];
		const c = ['4', '2', '1', '3'];
		const mappingC = ['A', 'B', 'B', 'A'];

		render(<App items={a} mapping={mappingA} />, scratch);
		expect(scratch.innerHTML).to.equal(
			'<ul><div>A: 4</div><div>A: 1</div><div>B: 2</div><div>B: 3</div></ul>'
		);

		set(b, mappingB);
		rerender();
		expect(scratch.innerHTML).to.equal(
			'<ul><div>B: 1</div><div>A: 2</div><div>A: 4</div><div>A: 3</div></ul>'
		);

		set(c, mappingC);
		rerender();
		expect(scratch.innerHTML).to.equal(
			'<ul><div>A: 4</div><div>B: 2</div><div>B: 1</div><div>A: 3</div></ul>'
		);
	});

	it('handle shuffled array children (moving to the front)', () => {
		const App = ({ items }) => (
			<div>
				{items.map(key => (
					<div key={key}>{key}</div>
				))}
			</div>
		);

		const a = ['0', '2', '7', '6', '1', '3', '5', '4'];
		const b = ['1', '0', '6', '7', '5', '2', '4', '3'];
		const c = ['0', '7', '2', '1', '3', '5', '6', '4'];

		render(<App items={a} />, scratch);
		expect(scratch.innerHTML).to.equal(
			`<div>${a.map(n => `<div>${n}</div>`).join('')}</div>`
		);

		render(<App items={b} />, scratch);
		expect(scratch.innerHTML).to.equal(
			`<div>${b.map(n => `<div>${n}</div>`).join('')}</div>`
		);

		render(<App items={c} />, scratch);
		expect(scratch.innerHTML).to.equal(
			`<div>${c.map(n => `<div>${n}</div>`).join('')}</div>`
		);
	});

	// #2949
	it.skip('should not swap unkeyed chlildren', () => {
		class X extends Component {
			constructor(props) {
				super(props);
				this.name = props.name;
			}
			render() {
				return <p>{this.name}</p>;
			}
		}

		function Foo({ condition }) {
			return (
				<div>
					{condition ? '' : <X name="A" />}
					{condition ? <X name="B" /> : ''}
				</div>
			);
		}

		render(<Foo />, scratch);
		expect(scratch.textContent).to.equal('A');

		render(<Foo condition />, scratch);
		expect(scratch.textContent).to.equal('B');

		render(<Foo />, scratch);
		expect(scratch.textContent).to.equal('A');
	});

	// #2949
	it.skip('should not swap unkeyed chlildren', () => {
		const calls = [];
		class X extends Component {
			constructor(props) {
				super(props);
				calls.push(props.name);
				this.name = props.name;
			}
			render() {
				return <p>{this.name}</p>;
			}
		}

		function Foo({ condition }) {
			return (
				<div>
					<X name="1" />
					{condition ? '' : <X name="A" />}
					{condition ? <X name="B" /> : ''}
					<X name="C" />
				</div>
			);
		}

		render(<Foo />, scratch);
		expect(scratch.textContent).to.equal('1AC');
		expect(calls).to.deep.equal(['1', 'A', 'C']);

		render(<Foo condition />, scratch);
		expect(scratch.textContent).to.equal('1BC');
		expect(calls).to.deep.equal(['1', 'A', 'C', 'B']);

		render(<Foo />, scratch);
		expect(scratch.textContent).to.equal('1AC');
		expect(calls).to.deep.equal(['1', 'A', 'C', 'B', 'A']);
	});

	it('should retain state for inserted children', () => {
		class X extends Component {
			constructor(props) {
				super(props);
				this.name = props.name;
			}
			render() {
				return <p>{this.name}</p>;
			}
		}

		function Foo({ condition }) {
			// We swap the prop from A to B but we don't expect this to
			// reflect in text-content as we are testing whether the
			// state is retained for a skew that matches the original children.
			//
			// We insert <span /> which should amount to a skew of -1 which should
			// make us correctly match the X component.
			return condition ? (
				<div>
					<span />
					<X name="B" />
				</div>
			) : (
				<div>
					<X name="A" />
				</div>
			);
		}

		render(<Foo />, scratch);
		expect(scratch.textContent).to.equal('A');

		render(<Foo condition />, scratch);
		expect(scratch.textContent).to.equal('A');

		render(<Foo />, scratch);
		expect(scratch.textContent).to.equal('A');
	});

	it('handle shuffled (stress test)', () => {
		function randomize(arr) {
			for (let i = arr.length - 1; i > 0; i--) {
				let j = Math.floor(Math.random() * (i + 1));
				[arr[i], arr[j]] = [arr[j], arr[i]];
			}
			return arr;
		}

		const App = ({ items }) => (
			<div>
				{items.map(key => (
					<div key={key}>{key}</div>
				))}
			</div>
		);

		const a = Array.from({ length: 8 }).map((_, i) => `${i}`);

		for (let i = 0; i < 10000; i++) {
			const aa = randomize(a);
			render(<App items={aa} />, scratch);
			expect(scratch.innerHTML).to.equal(
				`<div>${aa.map(n => `<div>${n}</div>`).join('')}</div>`
			);
		}
	});

	it('should work with document', () => {
		document.textContent = '';
		const App = () => (
			<Fragment>
				<head>
					<title>Test</title>
				</head>
				<body>
					<p>Test</p>
				</body>
			</Fragment>
		);
		render(<App />, document);
		expect(document.documentElement.innerHTML).to.equal(
			'<head><title>Test</title></head><body><p>Test</p></body>\n'
		);
	});
});
