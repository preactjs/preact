import { createElement, Component } from 'ceviche';

function createItems(count=10) {
	let items = [];
	for (let i=0; i<count; i++) {
		items.push({
			label: `Item #${i+1}`,
			key: i+1
		});
	}
	return items;
}

function random() {
	return Math.random() < .5 ? 1 : -1;
}

export default class Reorder extends Component {
	state = {
		items: createItems(),
		useKeys: false
	};

	shuffle = () => {
		this.setState({ items: this.state.items.slice().sort(random) });
	};

	swapTwo = () => {
		let items = this.state.items.slice(),
			first = Math.floor(Math.random()*items.length),
			second;
		do {
			second = Math.floor(Math.random()*items.length);
		} while (second===first);
		let other = items[first];
		items[first] = items[second];
		items[second] = other;
		this.setState({ items });
	};

	reverse = () => {
		this.setState({ items: this.state.items.slice().reverse() });
	};

	rotate = () => {
		let { items } = this.state;
		this.setState({ items: items.slice(1).concat(items[0]) });
	};

	toggleKeys = () => {
		this.setState({ useKeys: !this.state.useKeys });
	};

	renderItem = item => (
		<li key={this.state.useKeys ? item.key : null}>{item.label}</li>
	);

	render({}, { items, useKeys }) {
		return (
			<div class="reorder-demo">
				<header>
					<button onClick={this.shuffle}>Shuffle</button>
					<button onClick={this.swapTwo}>Swap Two</button>
					<button onClick={this.reverse}>Reverse</button>
					<button onClick={this.rotate}>Rotate</button>
					<label><input type="checkbox" onClick={this.toggleKeys} checked={useKeys} /> use keys?</label>
				</header>
				<ul>
					{items.map(this.renderItem)}
				</ul>
			</div>
		);
	}
}


/** Represents a single coloured dot. */
class Cursor extends Component {
	// get shared/pooled class object
	getClass(big, label) {
		let cl = 'cursor';
		if (big) cl += ' big';
		if (label) cl += ' label';
		return cl;
	}

	// skip any pointless re-renders
	shouldComponentUpdate(props) {
		for (let i in props) if (i !== 'children' && props[i] !== this.props[i]) return true;
		return false;
	}

	// first argument is "props", the attributes passed to <Cursor ...>
	render({ x, y, label, color, big }) {
		let inner = null;
		if (label) inner = <span class="label">{x},{y}</span>;
		return (
			<div
				class={this.getClass(big, label)}
				style={{
					transform: `translate(${x || 0}px, ${y || 0}px) scale(${big?2:1})`,
					// transform: `translate3d(${x || 0}px, ${y || 0}px, 0) scale(${big?2:1})`,
					borderColor: color
				}}
				// style={{ left: x || 0, top: y || 0, borderColor: color }}
			>{inner}</div>
		);
	}
}


// Addendum: disable dragging on mobile
addEventListener('touchstart', e => (e.preventDefault(), false));
