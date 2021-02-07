import { Store } from './store.js';

/**
 * @param {import('./index').Framework} framework
 */
export function getComponents({
	createElement,
	Component,
	createVNode = null
}) {
	if (createVNode) {
		return getComponentsNew({ createVNode, Component });
	}

	class Row extends Component {
		constructor(props) {
			super(props);
			this.onDelete = this.onDelete.bind(this);
			this.onClick = this.onClick.bind(this);
		}

		shouldComponentUpdate(nextProps, nextState) {
			return (
				nextProps.data !== this.props.data ||
				nextProps.styleClass !== this.props.styleClass
			);
		}

		onDelete() {
			this.props.onDelete(this.props.data.id);
		}

		onClick() {
			this.props.onClick(this.props.data.id);
		}

		render() {
			let { styleClass, onClick, onDelete, data } = this.props;
			return createElement(
				'tr',
				{
					className: styleClass
				},
				createElement(
					'td',
					{
						className: 'col-md-1'
					},
					data.id
				),
				createElement(
					'td',
					{
						className: 'col-md-4'
					},
					createElement(
						'a',
						{
							onClick: this.onClick
						},
						data.label
					)
				),
				createElement(
					'td',
					{
						className: 'col-md-1'
					},
					createElement(
						'a',
						{
							onClick: this.onDelete
						},
						createElement('span', {
							className: 'glyphicon glyphicon-remove',
							'aria-hidden': 'true'
						})
					)
				),
				createElement('td', {
					className: 'col-md-6'
				})
			);
		}
	}

	class Main extends Component {
		constructor(props) {
			super(props);
			this.state = { store: props.store ?? new Store() };
			this.select = this.select.bind(this);
			this.delete = this.delete.bind(this);

			// @ts-ignore
			window.app = this;
		}
		run() {
			this.state.store.run();
			this.setState({ store: this.state.store });
		}
		add() {
			this.state.store.add();
			this.setState({ store: this.state.store });
		}
		update() {
			this.state.store.update();
			this.setState({ store: this.state.store });
		}
		select(id) {
			this.state.store.select(id);
			this.setState({ store: this.state.store });
		}
		delete(id) {
			this.state.store.delete(id);
			this.setState({ store: this.state.store });
		}
		runLots() {
			this.state.store.runLots();
			this.setState({ store: this.state.store });
		}
		clear() {
			this.state.store.clear();
			this.setState({ store: this.state.store });
		}
		swapRows() {
			this.state.store.swapRows();
			this.setState({ store: this.state.store });
		}
		render() {
			let rows = this.state.store.data.map((d, i) => {
				return createElement(Row, {
					key: d.id,
					data: d,
					onClick: this.select,
					onDelete: this.delete,
					styleClass: d.id === this.state.store.selected ? 'danger' : ''
				});
			});
			return createElement(
				'div',
				{
					className: 'container'
				},
				createElement(
					'table',
					{
						className: 'table table-hover table-striped test-data'
					},
					createElement('tbody', {}, rows)
				),
				createElement('span', {
					className: 'preloadicon glyphicon glyphicon-remove',
					'aria-hidden': 'true'
				})
			);
		}
	}

	return { Main, Row };
}

/**
 * @typedef {import('./index').Framework} Framework
 * @param {{ createVNode: Framework["createVNode"], Component: Framework["Component"] }} framework
 */
function getComponentsNew({ createVNode, Component }) {
	class Row extends Component {
		constructor(props) {
			super(props);
			this.onDelete = this.onDelete.bind(this);
			this.onClick = this.onClick.bind(this);
		}

		shouldComponentUpdate(nextProps, nextState) {
			return (
				nextProps.data !== this.props.data ||
				nextProps.styleClass !== this.props.styleClass
			);
		}

		onDelete() {
			this.props.onDelete(this.props.data.id);
		}

		onClick() {
			this.props.onClick(this.props.data.id);
		}

		render() {
			let { styleClass, onClick, onDelete, data } = this.props;
			return createVNode(
				'tr',
				{
					className: styleClass,
					children: [
						createVNode(
							'td',
							{
								className: 'col-md-1',
								children: data.id
							},
							null,
							null,
							null
						),
						createVNode(
							'td',
							{
								className: 'col-md-4',
								children: createVNode(
									'a',
									{
										onClick: this.onClick,
										children: data.label
									},
									null,
									null,
									null
								)
							},
							null,
							null,
							null
						),
						createVNode(
							'td',
							{
								className: 'col-md-1',
								children: createVNode(
									'a',
									{
										onClick: this.onDelete,
										children: createVNode(
											'span',
											{
												className: 'glyphicon glyphicon-remove',
												'aria-hidden': 'true'
											},
											null,
											null
										)
									},
									null,
									null,
									null
								)
							},
							null,
							null,
							null
						),
						createVNode(
							'td',
							{
								className: 'col-md-6'
							},
							null,
							null,
							null
						)
					]
				},
				null,
				null,
				null
			);
		}
	}

	class Main extends Component {
		constructor(props) {
			super(props);
			this.state = { store: props.store ?? new Store() };
			this.select = this.select.bind(this);
			this.delete = this.delete.bind(this);

			// @ts-ignore
			window.app = this;
		}
		run() {
			this.state.store.run();
			this.setState({ store: this.state.store });
		}
		add() {
			this.state.store.add();
			this.setState({ store: this.state.store });
		}
		update() {
			this.state.store.update();
			this.setState({ store: this.state.store });
		}
		select(id) {
			this.state.store.select(id);
			this.setState({ store: this.state.store });
		}
		delete(id) {
			this.state.store.delete(id);
			this.setState({ store: this.state.store });
		}
		runLots() {
			this.state.store.runLots();
			this.setState({ store: this.state.store });
		}
		clear() {
			this.state.store.clear();
			this.setState({ store: this.state.store });
		}
		swapRows() {
			this.state.store.swapRows();
			this.setState({ store: this.state.store });
		}
		render() {
			let rows = this.state.store.data.map((d, i) => {
				return createVNode(
					Row,
					{
						data: d,
						onClick: this.select,
						onDelete: this.delete,
						styleClass: d.id === this.state.store.selected ? 'danger' : ''
					},
					d.id,
					null,
					null
				);
			});
			return createVNode(
				'div',
				{
					className: 'container',
					children: [
						createVNode(
							'table',
							{
								className: 'table table-hover table-striped test-data',
								children: createVNode(
									'tbody',
									{ children: rows },
									null,
									null,
									null
								)
							},
							null,
							null,
							null
						),
						createVNode(
							'span',
							{
								className: 'preloadicon glyphicon glyphicon-remove',
								'aria-hidden': 'true'
							},
							null,
							null,
							null
						)
					]
				},
				null,
				null,
				null
			);
		}
	}

	return { Main, Row };
}
