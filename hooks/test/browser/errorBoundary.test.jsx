import { Component, Fragment, createElement, render } from 'preact';
import { setupScratch, teardown } from '../../../test/_util/helpers';
import { useErrorBoundary, useLayoutEffect, useState } from 'preact/hooks';
import { setupRerender } from 'preact/test-utils';
import { vi } from 'vitest';

describe('errorBoundary', () => {
	/** @type {HTMLDivElement} */
	let scratch, rerender;

	beforeEach(() => {
		scratch = setupScratch();
		rerender = setupRerender();
	});

	afterEach(() => {
		teardown(scratch);
	});

	it('catches errors', () => {
		let resetErr,
			success = false;
		const Throws = () => {
			throw new Error('test');
		};

		const App = props => {
			const [err, reset] = useErrorBoundary();
			resetErr = reset;
			return err ? <p>Error</p> : success ? <p>Success</p> : <Throws />;
		};

		render(<App />, scratch);
		rerender();
		expect(scratch.innerHTML).to.equal('<p>Error</p>');

		success = true;
		resetErr();
		rerender();
		expect(scratch.innerHTML).to.equal('<p>Success</p>');
	});

	it('calls the errorBoundary callback', () => {
		const spy = vi.fn();
		const error = new Error('test');
		const Throws = () => {
			throw error;
		};

		const App = props => {
			const [err] = useErrorBoundary(spy);
			return err ? <p>Error</p> : <Throws />;
		};

		render(<App />, scratch);
		rerender();
		expect(scratch.innerHTML).to.equal('<p>Error</p>');
		expect(spy).toHaveBeenCalledOnce();
		expect(spy).toHaveBeenCalledWith(error, {});
	});

	it('returns error', () => {
		const error = new Error('test');
		const Throws = () => {
			throw error;
		};

		let returned;
		const App = () => {
			const [err] = useErrorBoundary();
			returned = err;
			return err ? <p>Error</p> : <Throws />;
		};

		render(<App />, scratch);
		rerender();
		expect(returned).to.equal(error);
	});

	it('does not leave a stale closure', () => {
		const spy = vi.fn(),
			spy2 = vi.fn();
		let resetErr;
		const error = new Error('test');
		const Throws = () => {
			throw error;
		};

		const App = props => {
			const [err, reset] = useErrorBoundary(props.onError);
			resetErr = reset;
			return err ? <p>Error</p> : <Throws />;
		};

		render(<App onError={spy} />, scratch);
		rerender();
		expect(scratch.innerHTML).to.equal('<p>Error</p>');
		expect(spy).toHaveBeenCalledOnce();
		expect(spy).toHaveBeenCalledWith(error, {});

		resetErr();
		render(<App onError={spy2} />, scratch);
		rerender();
		expect(spy).toHaveBeenCalledOnce();
		expect(spy2).toHaveBeenCalledOnce();
		expect(spy2).toHaveBeenCalledWith(error, {});
		expect(scratch.innerHTML).to.equal('<p>Error</p>');
	});

	it('does not invoke old effects when a cleanup callback throws an error and is handled', () => {
		let throwErr = false;
		let thrower = vi.fn(() => {
			if (throwErr) {
				throw new Error('test');
			}
		});
		let badEffect = vi.fn(() => thrower);
		let goodEffect = vi.fn();

		function EffectThrowsError() {
			useLayoutEffect(badEffect);
			return <span>Test</span>;
		}

		function Child({ children }) {
			useLayoutEffect(goodEffect);
			return children;
		}

		function App() {
			const [err] = useErrorBoundary();
			return err ? (
				<p>Error</p>
			) : (
				<Child>
					<EffectThrowsError />
				</Child>
			);
		}

		render(<App />, scratch);
		expect(scratch.innerHTML).to.equal('<span>Test</span>');
		expect(badEffect).toHaveBeenCalledOnce();
		expect(goodEffect).toHaveBeenCalledOnce();

		throwErr = true;
		render(<App />, scratch);
		rerender();
		expect(scratch.innerHTML).to.equal('<p>Error</p>');
		expect(thrower).toHaveBeenCalledOnce();
		expect(badEffect).toHaveBeenCalledOnce();
		expect(goodEffect).toHaveBeenCalledTimes(2);
	});

	describe('layout effect errors', () => {
		/** @type {string[]} */
		let log;

		beforeEach(() => {
			log = [];
		});

		class Boundary extends Component {
			constructor(props) {
				super(props);
				this.state = {};
			}
			static getDerivedStateFromError(error) {
				return { error: error.message };
			}
			componentDidCatch(error) {
				log.push(`${this.props.name} didCatch ${error.message}`);
			}
			render() {
				return this.state.error ? (
					<p>
						{this.props.name} {this.state.error}
					</p>
				) : (
					this.props.children
				);
			}
		}

		function Logged({ name, children }) {
			useLayoutEffect(() => {
				log.push(`${name} effect`);
				return () => log.push(`${name} cleanup`);
			});
			return children || null;
		}

		class ClassLogged extends Component {
			componentDidMount() {
				log.push(`${this.props.name} didMount`);
			}
			componentDidUpdate() {
				log.push(`${this.props.name} didUpdate`);
			}
			componentWillUnmount() {
				log.push(`${this.props.name} willUnmount`);
			}
			render() {
				return null;
			}
		}

		it('runs layout effects and lifecycles of other components when one layout effect throws', () => {
			function Bad() {
				useLayoutEffect(() => {
					log.push('bad effect 1');
					return () => log.push('bad cleanup 1');
				});
				useLayoutEffect(() => {
					log.push('bad effect 2');
					throw new Error('boom');
				});
				useLayoutEffect(() => {
					log.push('bad effect 3');
					return () => log.push('bad cleanup 3');
				});
				return <span>Bad</span>;
			}

			render(
				<div>
					<Boundary name="boundary">
						<Logged name="parent">
							<Logged name="before" />
							<Bad />
							<Logged name="after" />
							<ClassLogged name="class inside" />
						</Logged>
					</Boundary>
					<Logged name="outside" />
					<ClassLogged name="class outside" />
				</div>,
				scratch
			);

			expect(log).to.deep.equal([
				'before effect',
				'bad effect 1',
				'bad effect 2',
				'after effect',
				'parent effect',
				'outside effect',
				'boundary didCatch boom',
				'class inside didMount',
				'class outside didMount'
			]);

			log = [];
			rerender();
			expect(scratch.innerHTML).to.equal('<div><p>boundary boom</p></div>');
			expect(log).to.deep.equal([
				'parent cleanup',
				'before cleanup',
				'bad cleanup 1',
				'after cleanup',
				'class inside willUnmount'
			]);

			log = [];
			render(null, scratch);
			expect(log).to.deep.equal([
				'outside cleanup',
				'class outside willUnmount'
			]);
		});

		it('skips the remaining layout effects of a component whose layout cleanup throws', () => {
			let shouldThrow = false;
			function Bad() {
				useLayoutEffect(() => {
					log.push('bad effect 1');
					return () => log.push('bad cleanup 1');
				});
				useLayoutEffect(() => {
					log.push('bad effect 2');
					return () => {
						log.push('bad cleanup 2');
						if (shouldThrow) throw new Error('boom');
					};
				});
				useLayoutEffect(() => {
					log.push('bad effect 3');
					return () => log.push('bad cleanup 3');
				});
				return <span>Bad</span>;
			}

			const App = () => (
				<div>
					<Boundary name="boundary">
						<Bad />
						<Logged name="sibling" />
						<ClassLogged name="class" />
					</Boundary>
					<Logged name="outside" />
				</div>
			);

			render(<App />, scratch);
			log = [];

			shouldThrow = true;
			render(<App />, scratch);
			expect(log).to.deep.equal([
				'bad cleanup 1',
				'bad cleanup 2',
				'sibling cleanup',
				'sibling effect',
				'outside cleanup',
				'outside effect',
				'boundary didCatch boom',
				'class didUpdate'
			]);

			shouldThrow = false;
			log = [];
			rerender();
			expect(scratch.innerHTML).to.equal('<div><p>boundary boom</p></div>');
			// `bad cleanup 3` belongs to the effect that ran on mount.
			expect(log).to.deep.equal([
				'bad cleanup 3',
				'sibling cleanup',
				'class willUnmount'
			]);
		});

		it('routes every throwing layout effect of a commit to its own boundary', () => {
			function Bad({ id }) {
				useLayoutEffect(() => {
					log.push(`bad ${id} effect`);
					throw new Error(`error ${id}`);
				});
				return <span>{id}</span>;
			}

			render(
				<div>
					<Boundary name="a">
						<Bad id={1} />
						<Logged name="a sibling" />
						<Bad id={2} />
					</Boundary>
					<Boundary name="b">
						<Bad id={3} />
					</Boundary>
				</div>,
				scratch
			);

			expect(log).to.deep.equal([
				'bad 1 effect',
				'a sibling effect',
				'bad 2 effect',
				'bad 3 effect',
				'a didCatch error 1',
				'a didCatch error 2',
				'b didCatch error 3'
			]);

			log = [];
			rerender();
			expect(scratch.innerHTML).to.equal(
				'<div><p>a error 2</p><p>b error 3</p></div>'
			);
			expect(log).to.deep.equal(['a sibling cleanup']);
		});

		it('routes layout effect errors to useErrorBoundary without dropping sibling effects', () => {
			const spy = vi.fn();

			function Bad() {
				useLayoutEffect(() => {
					throw new Error('boom');
				});
				return <span>Bad</span>;
			}

			function App() {
				const [err] = useErrorBoundary(spy);
				return err ? <p>Error</p> : <Bad />;
			}

			render(
				<div>
					<App />
					<Logged name="sibling" />
				</div>,
				scratch
			);
			expect(log).to.deep.equal(['sibling effect']);
			expect(spy).toHaveBeenCalledOnce();

			rerender();
			expect(scratch.innerHTML).to.equal('<div><p>Error</p></div>');
		});

		it('does not run a layout effect twice after an uncaught layout effect error', () => {
			let shouldThrow = true;
			function Bad() {
				useLayoutEffect(() => {
					if (shouldThrow) throw new Error('uncaught');
				});
				return <span>Bad</span>;
			}

			let count = 0;
			function After({ value }) {
				useLayoutEffect(() => {
					const id = ++count;
					log.push(`effect ${id} ${value}`);
					return () => log.push(`cleanup ${id}`);
				}, [value]);
				return null;
			}

			expect(() =>
				render(
					<div>
						<Bad />
						<After value={1} />
					</div>,
					scratch
				)
			).to.throw('uncaught');
			expect(log).to.deep.equal(['effect 1 1']);

			shouldThrow = false;
			log = [];
			render(
				<div>
					<Bad />
					<After value={2} />
				</div>,
				scratch
			);
			expect(log).to.deep.equal(['cleanup 1', 'effect 2 2']);

			log = [];
			render(null, scratch);
			expect(log).to.deep.equal(['cleanup 2']);
		});
	});

	it('should not duplicate in lists where an item throws and the parent catches and returns a differing type', () => {
		const baseTodos = [
			{ text: 'first item', completed: false },
			{ text: 'Test the feature', completed: false },
			{ text: 'another item', completed: false }
		];

		function TodoList() {
			const [todos, setTodos] = useState([...baseTodos]);

			return (
				<Fragment>
					<ul>
						{todos.map((todo, index) => (
							<TodoItem
								key={index}
								toggleTodo={() => {
									todos[index] = {
										...todos[index],
										completed: !todos[index].completed
									};
									setTodos([...todos]);
								}}
								todo={todo}
								index={index}
							/>
						))}
					</ul>
				</Fragment>
			);
		}

		function TodoItem(props) {
			const [error] = useErrorBoundary();

			if (error) {
				return <li>An error occurred: {error}</li>;
			}

			return <TodoItemInner {...props} />;
		}
		let set;
		function TodoItemInner({ todo, index, toggleTodo }) {
			if (todo.completed) {
				throw new Error('Todo completed!');
			}

			if (index === 1) {
				set = toggleTodo;
			}

			return (
				<li>
					<label>
						<input
							type="checkbox"
							checked={todo.completed}
							onInput={toggleTodo}
						/>
						{todo.completed ? <s>{todo.text}</s> : todo.text}
					</label>
				</li>
			);
		}

		render(<TodoList />, scratch);
		expect(scratch.innerHTML).to.equal(
			'<ul><li><label><input type="checkbox">first item</label></li><li><label><input type="checkbox">Test the feature</label></li><li><label><input type="checkbox">another item</label></li></ul>'
		);

		set();
		rerender();
		expect(scratch.innerHTML).to.equal(
			'<ul><li><label><input type="checkbox">first item</label></li><li>An error occurred: </li><li><label><input type="checkbox">another item</label></li></ul>'
		);
	});
});
