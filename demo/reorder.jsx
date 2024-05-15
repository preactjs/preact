import { createElement, Component } from 'preact';

function createItems(count = 10) {
	let items = [];
	for (let i = 0; i < count; i++) {
		items.push({
			label: `Item #${i + 1}`,
			key: i + 1
		});
	}
	return items;
}

function random() {
	return Math.random() < 0.5 ? 1 : -1;
}

export default class Reorder extends Component {
	state = {
		items: createItems(),
		count: 1,
		useKeys: false
	};

	shuffle = () => {
		this.setState({ items: this.state.items.slice().sort(random) });
	};

	swapTwo = () => {
		let items = this.state.items.slice(),
			first = Math.floor(Math.random() * items.length),
			second;
		do {
			second = Math.floor(Math.random() * items.length);
		} while (second === first);
		let other = items[first];
		items[first] = items[second];
		items[second] = other;
		this.setState({ items });
	};

	reverse = () => {
		this.setState({ items: this.state.items.slice().reverse() });
	};

	setCount = e => {
		this.setState({ count: Math.round(e.target.value) });
	};

	rotate = () => {
		let { items, count } = this.state;
		items = items.slice(count).concat(items.slice(0, count));
		this.setState({ items });
	};

	rotateBackward = () => {
		let { items, count } = this.state,
			len = items.length;
		items = items.slice(len - count, len).concat(items.slice(0, len - count));
		this.setState({ items });
	};

	toggleKeys = () => {
		this.setState({ useKeys: !this.state.useKeys });
	};

	renderItem = item => (
		<li key={this.state.useKeys ? item.key : null}>{item.label}</li>
	);

	render({}, { items, count, useKeys }) {
		return (
			<div class="reorder-demo">
				<header>
					<button onClick={this.shuffle}>Shuffle</button>
					<button onClick={this.swapTwo}>Swap Two</button>
					<button onClick={this.reverse}>Reverse</button>
					<button onClick={this.rotate}>Rotate</button>
					<button onClick={this.rotateBackward}>Rotate Backward</button>
					<label>
						<input
							type="checkbox"
							onClick={this.toggleKeys}
							checked={useKeys}
						/>{' '}
						use keys?
					</label>
					<label>
						<input
							type="number"
							step="1"
							min="1"
							style={{ width: '3em' }}
							onInput={this.setCount}
							value={count}
						/>{' '}
						count
					</label>
				</header>
				<ul>{items.map(this.renderItem)}</ul>
			</div>
		);
	}
}
