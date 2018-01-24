import { createElement, Component } from 'ceviche';

let counter = 0;

export default class TodoList extends Component {
	state = { todos: [], text: '' };

	setText = e => {
		this.setState({ text: e.target.value });
	};

	addTodo = () => {
		let { todos, text } = this.state;
		todos = todos.concat({ text, id: ++counter });
		this.setState({ todos, text: '' });
	};

	removeTodo = e => {
		let id = e.target.getAttribute('data-id');
		this.setState({ todos: this.state.todos.filter( t => t.id!=id ) });
	};

	render({ }, { todos, text }) {
		return (
			<form onSubmit={this.addTodo} action="javascript:">
				<input value={text} onInput={this.setText} />
				<button type="submit">Add</button>
				<ul>
					{ todos.map( todo => (
						<li key={todo.id}>
							<button onClick={this.removeTodo} data-id={todo.id}>&times;</button>
							{' '}
							{todo.text}
						</li>
					)) }
				</ul>
			</form>
		);
	}
}
