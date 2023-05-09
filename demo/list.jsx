import { h, render } from 'preact';
import htm from 'htm';
import './style.css';

const html = htm.bind(h);
const createRoot = parent => ({
	render: v => render(v, parent)
});

function List({ items, renders, useKeys, useCounts, update }) {
	const toggleKeys = () => update({ useKeys: !useKeys });
	const toggleCounts = () => update({ useCounts: !useCounts });
	const swap = () => {
		const u = { items: items.slice() };
		u.items[1] = items[8];
		u.items[8] = items[1];
		update(u);
	};
	return html`
		<div>
			<button onClick=${update}>Re-render</button>
			<button onClick=${swap}>Swap 2 & 8</button>
			<label>
				<input type="checkbox" checked=${useKeys} onClick=${toggleKeys} />
				Use Keys
			</label>
			<label>
				<input type="checkbox" checked=${useCounts} onClick=${toggleCounts} />
				Counts
			</label>
			<ul class="list">
				${items.map(
					(item, i) => html`
						<li
							class=${i % 2 ? 'odd' : 'even'}
							key=${useKeys ? item.name : undefined}
						>
							${item.name} ${useCounts ? ` (${renders} renders)` : ''}
						</li>
					`
				)}
			</ul>
		</div>
	`;
}

const root = createRoot(document.body);

let data = {
	items: new Array(1000).fill(null).map((x, i) => ({ name: `Item ${i + 1}` })),
	renders: 0,
	useKeys: false,
	useCounts: false
};

function update(partial) {
	if (partial) Object.assign(data, partial);
	data.renders++;
	data.update = update;
	root.render(List(data));
}

update();
