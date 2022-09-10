import { createElement, Fragment, render } from 'preact';
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
			'<div id="P481"><div id="P15361"><span id="P15362">h</span></div></div>'
		);

		render(<Comp />, scratch);
		expect(scratch.innerHTML).to.equal(
			'<div id="P481"><div id="P15361"><span id="P15362">h</span></div></div>'
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
			'<div id="P481"><span id="P15361">h</span><span id="P15671">h</span><span id="P15981">h</span></div>'
		);

		render(<Comp />, scratch);
		expect(scratch.innerHTML).to.equal(
			'<div id="P481"><span id="P15361">h</span><span id="P15671">h</span><span id="P15981">h</span></div>'
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
			'<div id="P481"><div><span id="P476641">h</span></div></div>'
		);

		set(true);
		rerender();
		expect(scratch.innerHTML).to.equal(
			'<div id="P481"><div><span id="P476641">h</span><span id="P486251">h</span></div></div>'
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
});
