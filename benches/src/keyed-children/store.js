function _random(max) {
	return Math.round(Math.random() * 1000) % max;
}

export class Store {
	constructor() {
		this.data = [];
		this.selected = undefined;
		this.id = 1;
	}
	buildData(count = 1000) {
		var adjectives = [
			'pretty',
			'large',
			'big',
			'small',
			'tall',
			'short',
			'long',
			'handsome',
			'plain',
			'quaint',
			'clean',
			'elegant',
			'easy',
			'angry',
			'crazy',
			'helpful',
			'mushy',
			'odd',
			'unsightly',
			'adorable',
			'important',
			'inexpensive',
			'cheap',
			'expensive',
			'fancy'
		];
		var colours = [
			'red',
			'yellow',
			'blue',
			'green',
			'pink',
			'brown',
			'purple',
			'brown',
			'white',
			'black',
			'orange'
		];
		var nouns = [
			'table',
			'chair',
			'house',
			'bbq',
			'desk',
			'car',
			'pony',
			'cookie',
			'sandwich',
			'burger',
			'pizza',
			'mouse',
			'keyboard'
		];
		var data = [];
		for (var i = 0; i < count; i++)
			data.push({
				id: this.id++,
				label:
					adjectives[_random(adjectives.length)] +
					' ' +
					colours[_random(colours.length)] +
					' ' +
					nouns[_random(nouns.length)]
			});
		return data;
	}
	updateData(mod = 10) {
		for (let i = 0; i < this.data.length; i += 10) {
			this.data[i] = Object.assign({}, this.data[i], {
				label: this.data[i].label + ' !!!'
			});
		}
	}
	delete(id) {
		var idx = this.data.findIndex(d => d.id === id);
		this.data.splice(idx, 1);
	}
	run() {
		this.data = this.buildData();
		this.selected = undefined;
	}
	add() {
		this.data = this.data.concat(this.buildData(1000));
	}
	update() {
		this.updateData();
	}
	select(id) {
		this.selected = id;
	}
	runLots() {
		this.data = this.buildData(10000);
		this.selected = undefined;
	}
	clear() {
		this.data = [];
		this.selected = undefined;
	}
	swapRows() {
		if (this.data.length > 998) {
			var a = this.data[1];
			this.data[1] = this.data[998];
			this.data[998] = a;
		}
	}
}
