import { createElement, Component } from 'preact';

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
		this.setState({ todos: this.state.todos.filter(t => t.id != id) });
	};

	render({}, { todos, text }) {
		return (
			<form onSubmit={this.addTodo} action="javascript:">
				<input value={text} onInput={this.setText} />
				<button type="submit">Add</button>
				<ul>
					<TodoItems todos={todos} removeTodo={this.removeTodo} />
				</ul>
			</form>
		);
	}
}

class TodoItems extends Component {
	render({ todos, removeTodo }) {
		return todos.map(todo => (
			<li key={todo.id}>
				<button type="button" onClick={removeTodo} data-id={todo.id}>
					&times;
				</button>{' '}
				{todo.text}
			</li>
		));
	}
}
