import { Store } from './store.js';

/**
 * @param {import('./index').Framework} framework
 */
export function getComponents({ createElement, Component }) {
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
