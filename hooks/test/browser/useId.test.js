import { createElement, Fragment, hydrate, render } from 'preact';
import { useId, useReducer, useState } from 'preact/hooks';
import { setupRerender } from 'preact/test-utils';
import { render as rts } from 'preact-render-to-string';
import { setupScratch, teardown } from '../../../test/_util/helpers';

/** @jsx createElement */

describe('useId', () => {
	/** @type {HTMLDivElement} */
	let scratch, rerender;

	beforeEach(() => {
		scratch = setupScratch();
		rerender = setupRerender();
	});

	afterEach(() => {
		teardown(scratch);
	});

	it('keeps the id consistent after an update', () => {
		function Comp() {
			const id = useId();
			return <div id={id} />;
		}

		render(<Comp />, scratch);
		const id = scratch.firstChild.getAttribute('id');
		expect(scratch.firstChild.getAttribute('id')).to.equal(id);

		render(<Comp />, scratch);
		expect(scratch.firstChild.getAttribute('id')).to.equal(id);
	});

	it('ids are unique according to dom-depth', () => {
		function Child() {
			const id = useId();
			const spanId = useId();
			return (
				<div id={id}>
					<span id={spanId}>h</span>
				</div>
			);
		}

		function Comp() {
			const id = useId();
			return (
				<div id={id}>
					<Child />
				</div>
			);
		}

		render(<Comp />, scratch);
		expect(scratch.innerHTML).to.equal(
			'<div id="P0-0"><div id="P0-1"><span id="P0-2">h</span></div></div>'
		);

		render(<Comp />, scratch);
		expect(scratch.innerHTML).to.equal(
			'<div id="P0-0"><div id="P0-1"><span id="P0-2">h</span></div></div>'
		);
	});

	it('ids are unique across siblings', () => {
		function Child() {
			const id = useId();
			return <span id={id}>h</span>;
		}

		function Comp() {
			const id = useId();
			return (
				<div id={id}>
					<Child />
					<Child />
					<Child />
				</div>
			);
		}

		render(<Comp />, scratch);
		expect(scratch.innerHTML).to.equal(
			'<div id="P0-0"><span id="P0-1">h</span><span id="P0-2">h</span><span id="P0-3">h</span></div>'
		);

		render(<Comp />, scratch);
		expect(scratch.innerHTML).to.equal(
			'<div id="P0-0"><span id="P0-1">h</span><span id="P0-2">h</span><span id="P0-3">h</span></div>'
		);
	});

	it('correctly handles new elements', () => {
		let set;
		function Child() {
			const id = useId();
			return <span id={id}>h</span>;
		}

		function Stateful() {
			const [state, setState] = useState(false);
			set = setState;
			return (
				<div>
					<Child />
					{state && <Child />}
				</div>
			);
		}

		function Comp() {
			const id = useId();
			return (
				<div id={id}>
					<Stateful />
				</div>
			);
		}

		render(<Comp />, scratch);
		expect(scratch.innerHTML).to.equal(
			'<div id="P0-0"><div><span id="P0-1">h</span></div></div>'
		);

		set(true);
		rerender();
		expect(scratch.innerHTML).to.equal(
			'<div id="P0-0"><div><span id="P0-1">h</span><span id="P0-2">h</span></div></div>'
		);
	});

	it('matches with rts', () => {
		const ChildFragmentReturn = ({ children }) => {
			return <Fragment>{children}</Fragment>;
		};

		const ChildReturn = ({ children }) => {
			return children;
		};

		const SomeMessage = ({ msg }) => {
			const id = useId();
			return (
				<p>
					{msg} {id}
				</p>
			);
		};

		const Stateful = () => {
			const [count, add] = useReducer(c => c + 1, 0);
			const id = useId();
			return (
				<div>
					id: {id}, count: {count}
					<button onClick={add}>+1</button>
				</div>
			);
		};

		const Component = ({ showStateful = false }) => {
			const rootId = useId();
			const paragraphId = useId();

			return (
				<main>
					ID: {rootId}
					<p>Hello world id: {paragraphId}</p>
					{showStateful ? (
						<Stateful />
					) : (
						<ChildReturn>
							<SomeMessage msg="child-return" />
							<ChildReturn>
								<SomeMessage msg="child-return" />
								<ChildReturn>
									<SomeMessage msg="child-return" />
								</ChildReturn>
							</ChildReturn>
						</ChildReturn>
					)}
					<ChildFragmentReturn>
						<SomeMessage msg="child-fragment-return" />
						<SomeMessage msg="child-fragment-return-2" />
						<SomeMessage msg="child-fragment-return-3" />
						<SomeMessage msg="child-fragment-return-4" />
						<ChildReturn>
							<SomeMessage msg="child-return" />
							<ChildFragmentReturn>
								<SomeMessage msg="child-fragment-return" />
							</ChildFragmentReturn>
						</ChildReturn>
					</ChildFragmentReturn>
				</main>
			);
		};

		const rtsOutput = rts(<Component />);
		render(<Component />, scratch);
		expect(rtsOutput === scratch.innerHTML).to.equal(true);
	});

	it('matches with rts after hydration', () => {
		const ChildFragmentReturn = ({ children }) => {
			return <Fragment>{children}</Fragment>;
		};

		const ChildReturn = ({ children }) => {
			return children;
		};

		const SomeMessage = ({ msg }) => {
			const id = useId();
			return (
				<p>
					{msg} {id}
				</p>
			);
		};

		const Stateful = () => {
			const [count, add] = useReducer(c => c + 1, 0);
			const id = useId();
			return (
				<div>
					id: {id}, count: {count}
					<button onClick={add}>+1</button>
				</div>
			);
		};

		const Component = ({ showStateful = false }) => {
			const rootId = useId();
			const paragraphId = useId();

			return (
				<main>
					ID: {rootId}
					<p>Hello world id: {paragraphId}</p>
					{showStateful ? (
						<Stateful />
					) : (
						<ChildReturn>
							<SomeMessage msg="child-return" />
							<ChildReturn>
								<SomeMessage msg="child-return" />
								<ChildReturn>
									<SomeMessage msg="child-return" />
								</ChildReturn>
							</ChildReturn>
						</ChildReturn>
					)}
					<ChildFragmentReturn>
						<SomeMessage msg="child-fragment-return" />
						<SomeMessage msg="child-fragment-return-2" />
						<SomeMessage msg="child-fragment-return-3" />
						<SomeMessage msg="child-fragment-return-4" />
						<ChildReturn>
							<SomeMessage msg="child-return" />
							<ChildFragmentReturn>
								<SomeMessage msg="child-fragment-return" />
							</ChildFragmentReturn>
						</ChildReturn>
					</ChildFragmentReturn>
				</main>
			);
		};

		const rtsOutput = rts(<Component />);

		scratch.innerHTML = rtsOutput;
		hydrate(<Component />, scratch);
		expect(rtsOutput).to.equal(scratch.innerHTML);
	});

	it('should be unique across Fragments', () => {
		const ids = [];
		function Foo() {
			const id = useId();
			ids.push(id);
			return <p>{id}</p>;
		}

		function App() {
			return (
				<div>
					<Foo />
					<Fragment>
						<Foo />
					</Fragment>
				</div>
			);
		}

		render(<App />, scratch);

		expect(ids[0]).not.to.equal(ids[1]);
	});

	it('should match implicite Fragments with RTS', () => {
		function Foo() {
			const id = useId();
			return <p>{id}</p>;
		}

		function Bar(props) {
			return props.children;
		}

		function App() {
			return (
				<Bar>
					<Foo />
					<Fragment>
						<Foo />
					</Fragment>
				</Bar>
			);
		}

		const rtsOutput = rts(<App />);

		scratch.innerHTML = rtsOutput;
		hydrate(<App />, scratch);
		expect(rtsOutput).to.equal(scratch.innerHTML);
	});

	it('should skip component top level Fragment child', () => {
		const Wrapper = ({ children }) => {
			return <Fragment>{children}</Fragment>;
		};

		const ids = [];
		function Foo() {
			const id = useId();
			ids.push(id);
			return <p>{id}</p>;
		}

		function App() {
			const id = useId();
			ids.push(id);
			return (
				<div>
					<p>{id}</p>
					<Wrapper>
						<Foo />
					</Wrapper>
				</div>
			);
		}

		render(<App />, scratch);
		expect(ids[0]).not.to.equal(ids[1]);
	});

	it('should skip over HTML', () => {
		const ids = [];

		function Foo() {
			const id = useId();
			ids.push(id);
			return <p>{id}</p>;
		}

		function App() {
			return (
				<div>
					<span>
						<Foo />
					</span>
					<span>
						<Foo />
					</span>
				</div>
			);
		}

		render(<App />, scratch);
		expect(ids[0]).not.to.equal(ids[1]);
	});

	it('should reset for each renderToString roots', () => {
		const ids = [];

		function Foo() {
			const id = useId();
			ids.push(id);
			return <p>{id}</p>;
		}

		function App() {
			return (
				<div>
					<span>
						<Foo />
					</span>
					<span>
						<Foo />
					</span>
				</div>
			);
		}

		const res1 = rts(<App />);
		const res2 = rts(<App />);
		expect(res1).to.equal(res2);
	});

	it('should work with conditional components', () => {
		function Foo() {
			const id = useId();
			return <p>{id}</p>;
		}
		function Bar() {
			const id = useId();
			return <p>{id}</p>;
		}

		let update;
		function App() {
			const [v, setV] = useState(false);
			update = setV;
			return <div>{!v ? <Foo /> : <Bar />}</div>;
		}

		render(<App />, scratch);
		const first = scratch.innerHTML;

		update(v => !v);
		rerender();
		expect(first).not.to.equal(scratch.innerHTML);
	});
});
