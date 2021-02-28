/**
 * @typedef Framework
 * @property {(type: any, props?: any, ...children: any) => JSX.Element} createElement
 * @property {(root: HTMLElement) => ({ render(vnode: JSX.Element): void; hydrate(vnode: JSX.Element): void; })} createRoot
 * @property {any} Component
 *
 * @param {Framework} framework
 * @param {HTMLElement} container
 */
export function createUIBenchRunner(
	{ createElement, createRoot, Component },
	container
) {
	class TableCell extends Component {
		constructor(props) {
			super(props);
			this.onClick = this.onClick.bind(this);
		}

		shouldComponentUpdate(nextProps, nextState) {
			return this.props.text !== nextProps.text;
		}

		onClick(e) {
			console.log('Clicked' + this.props.text);
			e.stopPropagation();
		}

		render() {
			return createElement(
				'td',
				{ class: 'TableCell', onClick: this.onClick },
				this.props.text
			);
		}
	}

	function TableRow(props) {
		var data = props.data;
		var classes = 'TableRow';
		if (data.active) {
			classes = 'TableRow active';
		}
		var cells = data.props;

		var children = [
			createElement(TableCell, { key: '-1', text: '#' + data.id })
		];
		for (var i = 0; i < cells.length; i++) {
			children.push(createElement(TableCell, { key: i, text: cells[i] }));
		}

		return createElement(
			'tr',
			{ class: classes, 'data-id': data.id },
			children
		);
	}

	function Table(props) {
		var items = props.data.items;

		var children = [];
		for (var i = 0; i < items.length; i++) {
			var item = items[i];
			children.push(createElement(TableRow, { key: item.id, data: item }));
		}

		return createElement(
			'table',
			{ class: 'Table' },
			createElement('tbody', null, children)
		);
	}

	function AnimBox(props) {
		var data = props.data;
		var time = data.time;
		var style = {
			'border-radius': (time % 10).toString() + 'px',
			background: 'rgba(0,0,0,' + (0.5 + (time % 10) / 10).toString() + ')'
		};

		return createElement('div', {
			class: 'AnimBox',
			'data-id': data.id,
			style: style
		});
	}

	function Anim(props) {
		var data = props.data;
		var items = data.items;

		var children = [];
		for (var i = 0; i < items.length; i++) {
			var item = items[i];
			children.push(createElement(AnimBox, { key: item.id, data: item }));
		}

		return createElement('div', { class: 'Anim' }, children);
	}

	function TreeLeaf(props) {
		return createElement('li', { class: 'TreeLeaf' }, props.data.id);
	}

	function TreeNode(props) {
		var data = props.data;
		var children = [];

		for (var i = 0; i < data.children.length; i++) {
			var n = data.children[i];
			if (n.container) {
				children.push(createElement(TreeNode, { key: n.id, data: n }));
			} else {
				children.push(createElement(TreeLeaf, { key: n.id, data: n }));
			}
		}

		return createElement('ul', { class: 'TreeNode' }, children);
	}

	function Tree(props) {
		return createElement(
			'div',
			{ class: 'Tree' },
			createElement(TreeNode, { data: props.data.root })
		);
	}

	function Main(props) {
		var data = props.data;
		var location = data.location;

		var section;
		if (location === 'table') {
			section = createElement(Table, { data: data.table });
		} else if (location === 'anim') {
			section = createElement(Anim, { data: data.anim });
		} else if (location === 'tree') {
			section = createElement(Tree, { data: data.tree });
		}

		return createElement('div', { class: 'Main' }, section);
	}

	const root = createRoot(container);
	return {
		onUpdate(state) {
			root.render(createElement(Main, { data: state }));
		},
		onFinish(samples) {
			const samplesText = JSON.stringify(samples, null, ' ');
			container.innerHTML = `<pre>${samplesText}</pre>`;
		}
	};
}
