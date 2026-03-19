import { setupRerender } from 'preact/test-utils';
import { createElement, render, Component, Fragment, block } from 'preact';
import { setupScratch, teardown } from '../_util/helpers';
import { clearLog, getLog, logCall } from '../_util/logCall';
import { useState } from 'preact/hooks';
import { expect } from 'vitest';

/** @jsx createElement */

const h = createElement;

describe('block()', () => {
	let scratch, rerender;

	let resetAppendChild;
	let resetInsertBefore;
	let resetRemove;
	let resetRemoveText;
	let resetSetAttribute;
	let resetRemoveAttribute;

	beforeAll(() => {
		resetAppendChild = logCall(Element.prototype, 'appendChild');
		resetInsertBefore = logCall(Element.prototype, 'insertBefore');
		resetRemove = logCall(Element.prototype, 'remove');
		resetRemoveText = logCall(Text.prototype, 'remove');
		resetSetAttribute = logCall(Element.prototype, 'setAttribute');
		resetRemoveAttribute = logCall(Element.prototype, 'removeAttribute');
	});

	afterAll(() => {
		resetAppendChild();
		resetInsertBefore();
		resetRemove();
		resetRemoveText();
		resetSetAttribute();
		resetRemoveAttribute();
	});

	beforeEach(() => {
		scratch = setupScratch();
		rerender = setupRerender();
	});

	afterEach(() => {
		teardown(scratch);
	});

	it('should render a block with text slots on mount', () => {
		const _b = block(slot =>
			h(
				'div',
				{ class: 'container' },
				h('h1', null, slot(0)),
				h('p', null, slot(1))
			)
		);

		function App() {
			return _b('Title', 'Body text');
		}

		render(<App />, scratch);
		expect(scratch.innerHTML).to.equal(
			'<div class="container"><h1>Title</h1><p>Body text</p></div>'
		);
	});

	it('should render a block with VNode slots on mount', () => {
		function Badge({ label }) {
			return <span class="badge">{label}</span>;
		}

		const _b = block(slot => h('div', null, h('h1', null, 'Static'), slot(0)));

		function App() {
			return _b(<Badge label="New" />);
		}

		render(<App />, scratch);
		expect(scratch.innerHTML).to.equal(
			'<div><h1>Static</h1><span class="badge">New</span></div>'
		);
	});

	it('should render a block with array slots on mount', () => {
		const _b = block(slot => h('ul', null, slot(0)));

		function App() {
			return _b([<li key="a">A</li>, <li key="b">B</li>]);
		}

		render(<App />, scratch);
		expect(scratch.innerHTML).to.equal('<ul><li>A</li><li>B</li></ul>');
	});

	it('should update only changed text slots on re-render', () => {
		const _b = block(slot =>
			h(
				'div',
				{ class: 'container' },
				h('h1', null, 'Static Title'),
				h('p', null, slot(0))
			)
		);

		let update;
		function App() {
			const [text, setText] = useState('initial');
			update = v => setText(v);
			return _b(text);
		}

		render(<App />, scratch);
		expect(scratch.innerHTML).to.equal(
			'<div class="container"><h1>Static Title</h1><p>initial</p></div>'
		);

		const h1 = scratch.querySelector('h1');
		const div = scratch.querySelector('div');

		clearLog();
		update('updated');
		rerender();

		expect(scratch.innerHTML).to.equal(
			'<div class="container"><h1>Static Title</h1><p>updated</p></div>'
		);

		// Static elements should be the exact same DOM nodes
		expect(scratch.querySelector('h1')).to.equal(h1);
		expect(scratch.querySelector('div')).to.equal(div);

		// No DOM operations should have touched static elements
		const ops = getLog();
		const staticOps = ops.filter(
			op => op.includes('<h1>') || op.includes('<div>')
		);
		expect(staticOps).to.deep.equal([]);
	});

	it('should skip unchanged slots entirely', () => {
		const _b = block(slot =>
			h('div', null, h('span', null, slot(0)), h('span', null, slot(1)))
		);

		let update;
		function App() {
			const [count, setCount] = useState(0);
			update = () => setCount(c => c + 1);
			return _b('static text', count);
		}

		render(<App />, scratch);
		expect(scratch.innerHTML).to.equal(
			'<div><span>static text</span><span>0</span></div>'
		);

		// Grab DOM references for the static slot's text node
		const spans = scratch.querySelectorAll('span');
		const staticTextNode = spans[0].firstChild;
		const dynamicTextNode = spans[1].firstChild;

		update();
		rerender();

		expect(scratch.innerHTML).to.equal(
			'<div><span>static text</span><span>1</span></div>'
		);

		// Static slot should have the exact same text node (not recreated)
		expect(spans[0].firstChild).to.equal(staticTextNode);
		// Content should not have changed
		expect(spans[0].textContent).to.equal('static text');
	});

	it('should update VNode slots on re-render', () => {
		function Badge({ label }) {
			return <span class="badge">{label}</span>;
		}

		const _b = block(slot => h('div', null, h('h1', null, 'Title'), slot(0)));

		let update;
		function App() {
			const [label, setLabel] = useState('Old');
			update = v => setLabel(v);
			return _b(<Badge label={label} />);
		}

		render(<App />, scratch);
		expect(scratch.innerHTML).to.equal(
			'<div><h1>Title</h1><span class="badge">Old</span></div>'
		);

		update('New');
		rerender();

		expect(scratch.innerHTML).to.equal(
			'<div><h1>Title</h1><span class="badge">New</span></div>'
		);
	});

	it('should update array slots on re-render', () => {
		const _b = block(slot => h('ul', null, slot(0)));

		let update;
		function App() {
			const [items, setItems] = useState(['A', 'B']);
			update = v => setItems(v);
			return _b(items.map(item => <li key={item}>{item}</li>));
		}

		render(<App />, scratch);
		expect(scratch.innerHTML).to.equal('<ul><li>A</li><li>B</li></ul>');

		update(['A', 'B', 'C']);
		rerender();

		expect(scratch.innerHTML).to.equal(
			'<ul><li>A</li><li>B</li><li>C</li></ul>'
		);
	});

	it('should unmount block and clean up slot components', () => {
		let unmounted = false;

		class Child extends Component {
			componentWillUnmount() {
				unmounted = true;
			}
			render() {
				return <span>child</span>;
			}
		}

		const _b = block(slot => h('div', null, h('p', null, 'Static'), slot(0)));

		let update;
		function App() {
			const [show, setShow] = useState(true);
			update = v => setShow(v);
			return show ? _b(<Child />) : <span>gone</span>;
		}

		render(<App />, scratch);
		expect(scratch.innerHTML).to.equal(
			'<div><p>Static</p><span>child</span></div>'
		);

		update(false);
		rerender();

		expect(scratch.innerHTML).to.equal('<span>gone</span>');
		expect(unmounted).to.equal(true);
	});

	it('should handle slot type transitions', () => {
		const _b = block(slot => h('div', null, slot(0)));

		let update;
		function App() {
			const [loading, setLoading] = useState(true);
			update = v => setLoading(v);
			return _b(loading ? 'Loading...' : <p>Content</p>);
		}

		render(<App />, scratch);
		expect(scratch.innerHTML).to.equal('<div>Loading...</div>');

		update(false);
		rerender();

		expect(scratch.innerHTML).to.equal('<div><p>Content</p></div>');
	});

	it('should work alongside regular VNodes', () => {
		const _b = block(slot =>
			h('section', null, h('h2', null, 'Block'), h('p', null, slot(0)))
		);

		let update;
		function App() {
			const [count, setCount] = useState(0);
			update = () => setCount(c => c + 1);
			return (
				<div>
					<h1>Regular VNode</h1>
					{_b(count)}
					<footer>Also regular</footer>
				</div>
			);
		}

		render(<App />, scratch);
		expect(scratch.innerHTML).to.equal(
			'<div><h1>Regular VNode</h1><section><h2>Block</h2><p>0</p></section><footer>Also regular</footer></div>'
		);

		update();
		rerender();

		expect(scratch.innerHTML).to.equal(
			'<div><h1>Regular VNode</h1><section><h2>Block</h2><p>1</p></section><footer>Also regular</footer></div>'
		);
	});

	it('should support component inside a block slot', () => {
		function Counter() {
			const [count, setCount] = useState(0);
			return (
				<button onClick={() => setCount(c => c + 1)}>Count: {count}</button>
			);
		}

		const _b = block(slot => h('div', null, h('h1', null, 'Title'), slot(0)));

		function App() {
			return _b(<Counter />);
		}

		render(<App />, scratch);
		expect(scratch.innerHTML).to.equal(
			'<div><h1>Title</h1><button>Count: 0</button></div>'
		);
	});

	it('should support multiple instances of the same block', () => {
		const _b = block(slot =>
			h('div', { class: 'card' }, h('h2', null, slot(0)))
		);

		function App() {
			return (
				<div>
					{_b('Card A')}
					{_b('Card B')}
				</div>
			);
		}

		render(<App />, scratch);
		expect(scratch.innerHTML).to.equal(
			'<div><div class="card"><h2>Card A</h2></div><div class="card"><h2>Card B</h2></div></div>'
		);
	});

	it('should support nested blocks', () => {
		const inner = block(slot => h('span', null, slot(0)));
		const outer = block(slot =>
			h('div', null, h('h1', null, 'Outer'), slot(0))
		);

		let update;
		function App() {
			const [text, setText] = useState('hello');
			update = v => setText(v);
			return outer(inner(text));
		}

		render(<App />, scratch);
		expect(scratch.innerHTML).to.equal(
			'<div><h1>Outer</h1><span>hello</span></div>'
		);

		update('world');
		rerender();

		expect(scratch.innerHTML).to.equal(
			'<div><h1>Outer</h1><span>world</span></div>'
		);
	});
});
