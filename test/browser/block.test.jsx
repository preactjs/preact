import { setupRerender } from 'preact/test-utils';
import { createElement, render, hydrate, Component, Fragment, block } from 'preact';
import { setupScratch, teardown } from '../_util/helpers';
import { clearLog, getLog, logCall } from '../_util/logCall';
import { useState } from 'preact/hooks';
import { expect } from 'vitest';

/** @jsx createElement */

const h = createElement;

function tpl(html) {
	const t = document.createElement('template');
	t.innerHTML = html;
	return t.content.firstChild;
}

function svgTpl(html) {
	const t = document.createElement('template');
	t.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg">' + html + '</svg>';
	return t.content.firstChild.firstChild;
}

describe('block()', () => {
	let scratch, rerender;

	let resetAppendChild, resetInsertBefore, resetRemove, resetRemoveText, resetSetAttribute, resetRemoveAttribute;

	beforeAll(() => {
		resetAppendChild = logCall(Element.prototype, 'appendChild');
		resetInsertBefore = logCall(Element.prototype, 'insertBefore');
		resetRemove = logCall(Element.prototype, 'remove');
		resetRemoveText = logCall(Text.prototype, 'remove');
		resetSetAttribute = logCall(Element.prototype, 'setAttribute');
		resetRemoveAttribute = logCall(Element.prototype, 'removeAttribute');
	});

	afterAll(() => {
		resetAppendChild(); resetInsertBefore(); resetRemove();
		resetRemoveText(); resetSetAttribute(); resetRemoveAttribute();
	});

	beforeEach(() => {
		scratch = setupScratch();
		rerender = setupRerender();
	});

	afterEach(() => {
		teardown(scratch);
	});

	// --- Mount ---

	it('should render a block with text slots on mount', () => {
		const _b = block(
			tpl('<div class="container"><h1></h1><p></p></div>'),
			(r, p, c) => { c(0, r.firstChild); c(1, r.firstChild.nextSibling); }
		);

		function App() { return _b('Title', 'Body text'); }
		render(<App />, scratch);
		expect(scratch.innerHTML).to.equal(
			'<div class="container"><h1>Title</h1><p>Body text</p></div>'
		);
	});

	it('should render a block with VNode slots on mount', () => {
		function Badge({ label }) {
			return <span class="badge">{label}</span>;
		}

		const _b = block(
			tpl('<div><h1>Title</h1><div class="slot"></div></div>'),
			(r, p, c) => { c(0, r.childNodes[1]); }
		);

		function App() { return _b(<Badge label="New" />); }
		render(<App />, scratch);
		expect(scratch.innerHTML).to.equal(
			'<div><h1>Title</h1><div class="slot"><span class="badge">New</span></div></div>'
		);
	});

	it('should render a block with prop slots on mount', () => {
		const _b = block(
			tpl('<tr><td class="col-md-1"></td><td class="col-md-4"><a></a></td></tr>'),
			(r, p, c) => {
				p(0, r, 'className');
				c(1, r.firstChild);
				var a = r.childNodes[1].firstChild;
				p(2, a, 'onclick');
				c(3, a);
			}
		);

		let clicked = false;
		function App() {
			return _b('danger', 42, () => { clicked = true; }, 'Row 1');
		}

		render(<App />, scratch);
		expect(scratch.innerHTML).to.equal(
			'<tr class="danger"><td class="col-md-1">42</td><td class="col-md-4"><a>Row 1</a></td></tr>'
		);
		scratch.querySelector('a').click();
		expect(clicked).to.equal(true);
	});

	it('should handle null content slots', () => {
		const _b = block(tpl('<div><span></span></div>'), (r, p, c) => { c(0, r.firstChild); });
		render(createElement(() => _b(null)), scratch);
		expect(scratch.innerHTML).to.equal('<div><span></span></div>');
	});

	it('should support multiple instances of the same block', () => {
		const _b = block(tpl('<li></li>'), (r, p, c) => { c(0, r); });
		function App() { return h('ul', null, _b('A'), _b('B'), _b('C')); }
		render(<App />, scratch);
		expect(scratch.innerHTML).to.equal('<ul><li>A</li><li>B</li><li>C</li></ul>');
	});

	it('should position blocks correctly among siblings', () => {
		const _b = block(tpl('<span></span>'), (r, p, c) => { c(0, r); });
		function App() {
			return (<div><p>before</p>{_b('middle')}<p>after</p></div>);
		}
		render(<App />, scratch);
		expect(scratch.innerHTML).to.equal(
			'<div><p>before</p><span>middle</span><p>after</p></div>'
		);
	});

	// --- Update ---

	it('should update text slots on re-render', () => {
		const _b = block(
			tpl('<div><span></span><span></span></div>'),
			(r, p, c) => { c(0, r.firstChild); c(1, r.firstChild.nextSibling); }
		);

		let update;
		function App() {
			const [a, setA] = useState('hello');
			const [b, setB] = useState('world');
			update = (x, y) => { setA(x); setB(y); };
			return _b(a, b);
		}

		render(<App />, scratch);
		const div = scratch.querySelector('div');
		update('foo', 'bar');
		rerender();
		expect(scratch.innerHTML).to.equal('<div><span>foo</span><span>bar</span></div>');
		expect(scratch.querySelector('div')).to.equal(div);
	});

	it('should update prop slots on re-render', () => {
		const _b = block(
			tpl('<tr><td class="static"></td><td class="static"><a></a></td></tr>'),
			(r, p, c) => {
				p(0, r, 'className');
				c(1, r.firstChild);
				var a = r.childNodes[1].firstChild;
				p(2, a, 'onclick');
				c(3, a);
			}
		);

		let update;
		function App() {
			const [selected, setSelected] = useState(false);
			const [label, setLabel] = useState('Row 1');
			update = (s, l) => { setSelected(s); setLabel(l); };
			return _b(selected ? 'danger' : '', 1, () => setSelected(true), label);
		}

		render(<App />, scratch);
		const tr = scratch.querySelector('tr');
		update(true, 'Row 1 !!!');
		rerender();
		expect(scratch.innerHTML).to.equal(
			'<tr class="danger"><td class="static">1</td><td class="static"><a>Row 1 !!!</a></td></tr>'
		);
		expect(scratch.querySelector('tr')).to.equal(tr);
	});

	it('should update VNode slots on re-render', () => {
		function Badge({ label }) {
			return <span class="badge">{label}</span>;
		}

		const _b = block(
			tpl('<div><h1>Title</h1><div class="slot"></div></div>'),
			(r, p, c) => { c(0, r.childNodes[1]); }
		);

		let update;
		function App() {
			const [label, setLabel] = useState('Old');
			update = v => setLabel(v);
			return _b(<Badge label={label} />);
		}

		render(<App />, scratch);
		update('New');
		rerender();
		expect(scratch.innerHTML).to.equal(
			'<div><h1>Title</h1><div class="slot"><span class="badge">New</span></div></div>'
		);
	});

	it('should skip unchanged slots entirely', () => {
		const _b = block(
			tpl('<div><span></span><span></span></div>'),
			(r, p, c) => { c(0, r.firstChild); c(1, r.firstChild.nextSibling); }
		);

		let update;
		function App() {
			const [count, setCount] = useState(0);
			update = () => setCount(c => c + 1);
			return _b('static', count);
		}

		render(<App />, scratch);
		const staticText = scratch.querySelectorAll('span')[0].firstChild;
		update();
		rerender();
		expect(scratch.innerHTML).to.equal('<div><span>static</span><span>1</span></div>');
		expect(scratch.querySelectorAll('span')[0].firstChild).to.equal(staticText);
	});

	it('should skip unchanged prop slots', () => {
		const _b = block(
			tpl('<div></div>'),
			(r, p, c) => { p(0, r, 'className'); p(1, r, 'data-id'); c(2, r); }
		);

		let update;
		function App() {
			const [cls] = useState('fixed');
			const [id, setId] = useState('a');
			const [text, setText] = useState('hello');
			update = (i, t) => { setId(i); setText(t); };
			return _b(cls, id, text);
		}

		render(<App />, scratch);
		clearLog();
		update('b', 'world');
		rerender();
		expect(scratch.innerHTML).to.equal('<div class="fixed" data-id="b">world</div>');
		expect(getLog().filter(op => op.includes('class'))).to.deep.equal([]);
	});

	it('should handle slot type transitions', () => {
		const _b = block(tpl('<div><span></span></div>'), (r, p, c) => { c(0, r.firstChild); });

		let update;
		function App() {
			const [loading, setLoading] = useState(true);
			update = v => setLoading(v);
			return _b(loading ? 'Loading...' : <p>Content</p>);
		}

		render(<App />, scratch);
		expect(scratch.innerHTML).to.equal('<div><span>Loading...</span></div>');
		update(false);
		rerender();
		expect(scratch.innerHTML).to.equal('<div><span><p>Content</p></span></div>');
	});

	// --- Unmount ---

	it('should unmount and clean up slot components', () => {
		let unmounted = false;
		class Child extends Component {
			componentWillUnmount() { unmounted = true; }
			render() { return <span>child</span>; }
		}

		const _b = block(
			tpl('<div><p>Static</p><div class="slot"></div></div>'),
			(r, p, c) => { c(0, r.childNodes[1]); }
		);

		let update;
		function App() {
			const [show, setShow] = useState(true);
			update = v => setShow(v);
			return show ? _b(<Child />) : <span>gone</span>;
		}

		render(<App />, scratch);
		update(false);
		rerender();
		expect(scratch.innerHTML).to.equal('<span>gone</span>');
		expect(unmounted).to.equal(true);
	});

	// --- Keyed lists ---

	it('should support keyed block instances', () => {
		const _b = block(
			tpl('<li></li>'),
			(r, p, c) => { c(0, r); p(1, r, 'className'); }
		);

		let update;
		function App() {
			const [items, setItems] = useState([
				{ id: 1, text: 'A' }, { id: 2, text: 'B' }, { id: 3, text: 'C' }
			]);
			update = v => setItems(v);
			return h('ul', null, items.map(item => {
				const vnode = _b(item.text, 'item');
				vnode.key = item.id;
				return vnode;
			}));
		}

		render(<App />, scratch);
		expect(scratch.innerHTML).to.equal(
			'<ul><li class="item">A</li><li class="item">B</li><li class="item">C</li></ul>'
		);
		update([{ id: 3, text: 'C' }, { id: 2, text: 'B' }, { id: 1, text: 'A' }]);
		rerender();
		expect(scratch.innerHTML).to.equal(
			'<ul><li class="item">C</li><li class="item">B</li><li class="item">A</li></ul>'
		);
	});

	// --- Nesting ---

	it('should work alongside regular VNodes', () => {
		const _b = block(
			tpl('<section><h2>Block</h2><p></p></section>'),
			(r, p, c) => { c(0, r.childNodes[1]); }
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

	it('should support nested blocks', () => {
		const inner = block(tpl('<span></span>'), (r, p, c) => { c(0, r); });
		const outer = block(
			tpl('<div><h1>Outer</h1><div class="slot"></div></div>'),
			(r, p, c) => { c(0, r.childNodes[1]); }
		);

		let update;
		function App() {
			const [text, setText] = useState('hello');
			update = v => setText(v);
			return outer(inner(text));
		}

		render(<App />, scratch);
		expect(scratch.innerHTML).to.equal(
			'<div><h1>Outer</h1><div class="slot"><span>hello</span></div></div>'
		);
		update('world');
		rerender();
		expect(scratch.innerHTML).to.equal(
			'<div><h1>Outer</h1><div class="slot"><span>world</span></div></div>'
		);
	});

	// --- Ref ---

	it('should handle ref on block VNode', () => {
		const _b = block(tpl('<div><p></p></div>'), (r, p, c) => { c(0, r.firstChild); });

		let refValue = null;
		function App() {
			const vnode = _b('hello');
			vnode.ref = el => { refValue = el; };
			return vnode;
		}

		render(<App />, scratch);
		expect(scratch.innerHTML).to.equal('<div><p>hello</p></div>');
		expect(refValue).to.equal(scratch.querySelector('div'));
	});

	it('should support nested dynamic props', () => {
		const _b = block(
			tpl('<div><a></a></div>'),
			(r, p, c) => {
				var a = r.firstChild;
				p(0, a, 'href');
				p(1, a, 'className');
				c(2, a);
			}
		);

		let update;
		function App() {
			const [href, setHref] = useState('/page1');
			const [cls, setCls] = useState('link');
			update = (h, c) => { setHref(h); setCls(c); };
			return _b(href, cls, 'Click');
		}

		render(<App />, scratch);
		expect(scratch.innerHTML).to.equal(
			'<div><a href="/page1" class="link">Click</a></div>'
		);
		update('/page2', 'link active');
		rerender();
		expect(scratch.innerHTML).to.equal(
			'<div><a href="/page2" class="link active">Click</a></div>'
		);
	});

	// --- Hydration ---

	it('should hydrate reusing existing DOM', () => {
		scratch.innerHTML = '<div><h1>Title</h1><p>hello</p></div>';
		const h1Before = scratch.querySelector('h1');
		const pBefore = scratch.querySelector('p');

		const _b = block(
			tpl('<div><h1>Title</h1><p></p></div>'),
			(r, p, c) => { c(0, r.childNodes[1]); }
		);

		function App() { return _b('hello'); }
		hydrate(<App />, scratch);
		expect(scratch.innerHTML).to.equal('<div><h1>Title</h1><p>hello</p></div>');
		expect(scratch.querySelector('h1')).to.equal(h1Before);
		expect(scratch.querySelector('p')).to.equal(pBefore);
	});

	it('should attach event handlers during hydration', () => {
		scratch.innerHTML = '<div><button>Click</button></div>';
		let clicked = false;

		const _b = block(
			tpl('<div><button>Click</button></div>'),
			(r, p, c) => { p(0, r.firstChild, 'onclick'); }
		);

		function App() { return _b(() => { clicked = true; }); }
		hydrate(<App />, scratch);
		scratch.querySelector('button').click();
		expect(clicked).to.equal(true);
	});

	it('should update slots after hydration', () => {
		scratch.innerHTML = '<div><span>0</span></div>';

		const _b = block(
			tpl('<div><span></span></div>'),
			(r, p, c) => { c(0, r.firstChild); }
		);

		let update;
		function App() {
			const [count, setCount] = useState(0);
			update = () => setCount(c => c + 1);
			return _b(count);
		}

		hydrate(<App />, scratch);
		update();
		rerender();
		expect(scratch.innerHTML).to.equal('<div><span>1</span></div>');
	});

	it('should fall back to clone on hydration mismatch', () => {
		scratch.innerHTML = '<section>wrong</section>';

		const _b = block(tpl('<div><p></p></div>'), (r, p, c) => { c(0, r.firstChild); });

		function App() { return _b('content'); }
		hydrate(<App />, scratch);
		expect(scratch.querySelector('div')).to.not.equal(null);
		expect(scratch.querySelector('p').textContent).to.equal('content');
	});

	// --- SVG ---

	it('should render SVG blocks with correct namespace', () => {
		const _b = block(
			svgTpl('<circle></circle>'),
			(r, p, c) => { p(0, r, 'cx'); p(1, r, 'cy'); p(2, r, 'r'); }
		);

		function App() {
			return h('svg', { width: 100, height: 100 }, _b('50', '50', '25'));
		}

		render(<App />, scratch);
		const circle = scratch.querySelector('circle');
		expect(circle).to.not.equal(null);
		expect(circle.namespaceURI).to.equal('http://www.w3.org/2000/svg');
		expect(circle.getAttribute('cx')).to.equal('50');
	});

	it('should update SVG block prop slots', () => {
		const _b = block(
			svgTpl('<rect></rect>'),
			(r, p, c) => { p(0, r, 'width'); p(1, r, 'height'); p(2, r, 'fill'); }
		);

		let update;
		function App() {
			const [w, setW] = useState('10');
			update = v => setW(v);
			return h('svg', null, _b(w, '20', 'red'));
		}

		render(<App />, scratch);
		expect(scratch.querySelector('rect').getAttribute('width')).to.equal('10');
		update('50');
		rerender();
		expect(scratch.querySelector('rect').getAttribute('width')).to.equal('50');
	});
});
