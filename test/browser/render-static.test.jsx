import { setupRerender } from 'preact/test-utils';
import { createElement, render, hydrate, Component, Fragment } from 'preact';
import { jsxStatic } from 'preact/jsx-runtime';
import { setupScratch, teardown, serializeHtml } from '../_util/helpers';
import { clearLog, getLog, logCall } from '../_util/logCall';
import { useState } from 'preact/hooks';
import { expect, vi } from 'vitest';

/** @jsx createElement */

describe('MODE_STATIC', () => {
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

	it('should render static VNodes on first render', () => {
		function App() {
			return createElement(
				'div',
				null,
				jsxStatic('h1', { children: 'Title' }),
				jsxStatic('p', { children: 'Static text' })
			);
		}

		render(createElement(App, null), scratch);
		expect(scratch.innerHTML).to.equal(
			'<div><h1>Title</h1><p>Static text</p></div>'
		);
	});

	it('should skip prop diffing on static VNodes during re-render', () => {
		let update;
		function App() {
			const [count, setCount] = useState(0);
			update = () => setCount(c => c + 1);
			return createElement(
				'div',
				null,
				jsxStatic('h1', { class: 'title', children: 'Title' }),
				createElement('p', null, count)
			);
		}

		render(createElement(App, null), scratch);
		expect(scratch.innerHTML).to.equal(
			'<div><h1 class="title">Title</h1><p>0</p></div>'
		);

		const h1 = scratch.querySelector('h1');

		clearLog();
		update();
		rerender();

		expect(scratch.innerHTML).to.equal(
			'<div><h1 class="title">Title</h1><p>1</p></div>'
		);

		// h1 DOM node should be the exact same reference (not recreated)
		expect(scratch.querySelector('h1')).to.equal(h1);

		// No setAttribute calls should have touched the static h1
		const ops = getLog();
		const h1Ops = ops.filter(op => op.includes('<h1>'));
		expect(h1Ops).to.deep.equal([]);
	});

	it('should still diff children of static VNodes', () => {
		let update;
		function App() {
			const [count, setCount] = useState(0);
			update = () => setCount(c => c + 1);
			// The div is static (its own props don't change),
			// but it has a dynamic child
			return jsxStatic('div', {
				class: 'container',
				children: [
					jsxStatic('h1', { children: 'Title' }),
					createElement('p', null, count)
				]
			});
		}

		render(createElement(App, null), scratch);
		expect(scratch.innerHTML).to.equal(
			'<div class="container"><h1>Title</h1><p>0</p></div>'
		);

		const div = scratch.querySelector('div');
		const h1 = scratch.querySelector('h1');

		clearLog();
		update();
		rerender();

		expect(scratch.innerHTML).to.equal(
			'<div class="container"><h1>Title</h1><p>1</p></div>'
		);

		// Static div's own props were not re-diffed, but children were
		expect(scratch.querySelector('div')).to.equal(div);
		expect(scratch.querySelector('h1')).to.equal(h1);
		expect(scratch.querySelector('p').textContent).to.equal('1');

		// No setAttribute on the static div or h1
		const ops = getLog();
		const divSetAttr = ops.filter(
			op => op.includes('<div>') && op.includes('setAttribute')
		);
		expect(divSetAttr).to.deep.equal([]);
	});

	it('should handle mixed static and dynamic siblings', () => {
		let update;
		function App() {
			const [text, setText] = useState('hello');
			update = v => setText(v);
			return createElement(
				'div',
				null,
				jsxStatic('header', { children: 'Static Header' }),
				createElement('span', null, text),
				jsxStatic('footer', { children: 'Static Footer' })
			);
		}

		render(createElement(App, null), scratch);
		expect(scratch.innerHTML).to.equal(
			'<div><header>Static Header</header><span>hello</span><footer>Static Footer</footer></div>'
		);

		const header = scratch.querySelector('header');
		const footer = scratch.querySelector('footer');

		update('world');
		rerender();

		expect(scratch.innerHTML).to.equal(
			'<div><header>Static Header</header><span>world</span><footer>Static Footer</footer></div>'
		);

		// Static elements should be the same DOM nodes
		expect(scratch.querySelector('header')).to.equal(header);
		expect(scratch.querySelector('footer')).to.equal(footer);
	});

	it('should handle deeply nested static subtrees with dynamic leaves', () => {
		let update;
		function App() {
			const [count, setCount] = useState(0);
			update = () => setCount(c => c + 1);
			return jsxStatic('div', {
				children: jsxStatic('section', {
					children: [
						jsxStatic('h1', { children: 'Deep Static' }),
						createElement('span', null, count)
					]
				})
			});
		}

		render(createElement(App, null), scratch);
		expect(scratch.innerHTML).to.equal(
			'<div><section><h1>Deep Static</h1><span>0</span></section></div>'
		);

		const section = scratch.querySelector('section');
		const h1 = scratch.querySelector('h1');

		clearLog();
		update();
		rerender();

		expect(scratch.innerHTML).to.equal(
			'<div><section><h1>Deep Static</h1><span>1</span></section></div>'
		);

		// Static nodes kept their DOM references
		expect(scratch.querySelector('section')).to.equal(section);
		expect(scratch.querySelector('h1')).to.equal(h1);
		// Dynamic child updated
		expect(scratch.querySelector('span').textContent).to.equal('1');
	});

	it('should properly unmount static subtrees', () => {
		let update;
		function App() {
			const [show, setShow] = useState(true);
			update = v => setShow(v);
			return createElement(
				'div',
				null,
				show ? jsxStatic('section', { children: 'Static content' }) : null,
				createElement('span', null, 'always here')
			);
		}

		render(createElement(App, null), scratch);
		expect(scratch.innerHTML).to.equal(
			'<div><section>Static content</section><span>always here</span></div>'
		);

		update(false);
		rerender();

		expect(scratch.innerHTML).to.equal('<div><span>always here</span></div>');

		// Re-mount static content
		update(true);
		rerender();

		expect(scratch.innerHTML).to.equal(
			'<div><section>Static content</section><span>always here</span></div>'
		);
	});

	it('should hydrate static VNodes correctly', () => {
		scratch.innerHTML = '<div><h1>Title</h1><p>Dynamic</p></div>';

		const h1Before = scratch.querySelector('h1');

		function App() {
			return createElement(
				'div',
				null,
				jsxStatic('h1', { children: 'Title' }),
				createElement('p', null, 'Dynamic')
			);
		}

		hydrate(createElement(App, null), scratch);

		expect(scratch.innerHTML).to.equal(
			'<div><h1>Title</h1><p>Dynamic</p></div>'
		);

		// h1 should be reused from SSR (not recreated)
		expect(scratch.querySelector('h1')).to.equal(h1Before);
	});

	it('should skip prop diffing on static VNodes after hydration', () => {
		scratch.innerHTML = '<div><h1>Title</h1><span>0</span></div>';

		let update;
		function App() {
			const [count, setCount] = useState(0);
			update = () => setCount(c => c + 1);
			return createElement(
				'div',
				null,
				jsxStatic('h1', { children: 'Title' }),
				createElement('span', null, count)
			);
		}

		hydrate(createElement(App, null), scratch);
		const h1 = scratch.querySelector('h1');

		clearLog();
		update();
		rerender();

		expect(scratch.innerHTML).to.equal(
			'<div><h1>Title</h1><span>1</span></div>'
		);

		// h1 should still be the same DOM node
		expect(scratch.querySelector('h1')).to.equal(h1);

		// No DOM operations on static h1
		const ops = getLog();
		const h1Ops = ops.filter(op => op.includes('<h1>'));
		expect(h1Ops).to.deep.equal([]);
	});

	it('should not skip on first render even with static flag', () => {
		function App() {
			return jsxStatic('div', {
				class: 'root',
				children: 'Hello'
			});
		}

		render(createElement(App, null), scratch);
		expect(scratch.innerHTML).to.equal('<div class="root">Hello</div>');
	});

	it('should handle static parent with dynamic child that changes type', () => {
		let update;
		function App() {
			const [useSpan, setUseSpan] = useState(false);
			update = () => setUseSpan(true);
			return jsxStatic('div', {
				class: 'wrapper',
				children: useSpan
					? createElement('span', null, 'span')
					: createElement('p', null, 'paragraph')
			});
		}

		render(createElement(App, null), scratch);
		expect(scratch.innerHTML).to.equal(
			'<div class="wrapper"><p>paragraph</p></div>'
		);

		update();
		rerender();

		expect(scratch.innerHTML).to.equal(
			'<div class="wrapper"><span>span</span></div>'
		);
	});
});
