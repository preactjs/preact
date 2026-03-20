import { useState } from 'preact/hooks';
import { block } from 'preact';

// Template: a card with dynamic title, body, and click handler
const _tpl = (() => {
	const div = document.createElement('div');
	div.className = 'block-card';
	div.style.cssText =
		'border:1px solid #ccc;padding:16px;margin:8px;border-radius:8px;cursor:pointer';

	const h3 = document.createElement('h3');
	const p = document.createElement('p');
	const small = document.createElement('small');
	small.textContent = 'Click to increment';

	div.appendChild(h3);
	div.appendChild(p);
	div.appendChild(small);
	return div;
})();

const Card = block(
	() => _tpl,
	(r, p, c) => {
		p(0, r, 'onclick');
		c(1, r.firstChild);
		c(2, r.firstChild.nextSibling);
	}
);

function Counter({ label }) {
	const [count, setCount] = useState(0);
	const vnode = Card(() => setCount(c => c + 1), label, `Count: ${count}`);
	return vnode;
}

export default function BlocksDemo() {
	const [items, setItems] = useState([
		{ id: 1, name: 'Alpha' },
		{ id: 2, name: 'Beta' },
		{ id: 3, name: 'Gamma' }
	]);

	return (
		<div>
			<h2>Blocks Demo</h2>
			<p>
				Each card below is a block — static DOM cloned via{' '}
				<code>cloneNode</code>, dynamic slots updated directly.
			</p>
			<div style="display:flex;flex-wrap:wrap">
				{items.map(item => {
					const vnode = Card(
						() =>
							setItems(prev =>
								prev.map(i =>
									i.id === item.id ? { ...i, name: i.name + '!' } : i
								)
							),
						item.name,
						`ID: ${item.id}`
					);
					vnode.key = item.id;
					return vnode;
				})}
			</div>
			<Counter label="Standalone Counter" />
			<button
				onClick={() =>
					setItems(prev => [
						...prev,
						{ id: prev.length + 1, name: `Item ${prev.length + 1}` }
					])
				}
			>
				Add Item
			</button>
		</div>
	);
}
