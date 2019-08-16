import { setupScratch, teardown } from '../../../../test/_util/helpers';
import { useState, useMemo, useReducer } from 'preact/hooks';
import { setupRerender } from 'preact/test-utils';
import { h, render } from 'preact';
import { getChangeDescription } from '../../../src/devtools/profiling';
import { initDevTools } from '../../../src/devtools';
import { createMockDevtoolsHook } from './mock-hook';

/** @jsx h */

function getRendererd(scratch) {
	return scratch._children._children[0];
}

describe('devtools', () => {

	/** @type {HTMLDivElement} */
	let scratch;

	/** @type {() => void} */
	let rerender;

	/** @type {() => void} */
	let teardownDevtools;

	beforeEach(() => {
		createMockDevtoolsHook();
		teardownDevtools = initDevTools();
		scratch = setupScratch();
		rerender = setupRerender();
	});

	afterEach(() => {
		teardown(scratch);
		teardownDevtools();
	});

	describe('getChangeDescription', () => {
		it('should detect useState changes', () => {
			let update;
			function App() {
				let [v, set] = useState(0);
				update = set;
				return <div>counter {v}</div>;
			}

			render(<App />, scratch);
			update(1);
			rerender();

			let change = getChangeDescription(getRendererd(scratch));
			expect(change).to.deep.equal({
				context: false,
				didHooksChange: true,
				isFirstMount: false,
				props: null,
				state: null
			});
		});

		it('should not update useState when parent changes', () => {
			let update;
			function Child() {
				let [v] = useState(0);
				return <div>counter {v}</div>;
			}

			function Parent() {
				let args = useState(0);
				update = args[1];
				return <Child />;
			}

			render(<Parent />, scratch);
			update(1);
			rerender();

			let change = getChangeDescription(getRendererd(scratch)._children[0]);
			expect(change).to.deep.equal({
				context: false,
				didHooksChange: false,
				isFirstMount: false,
				props: null,
				state: null
			});
		});

		it('should detect useMemo changes', () => {
			function App(props) {
				let v = useMemo(() => 42, [props.a]);
				return <div>counter {v}</div>;
			}

			render(<App a={1} />, scratch);
			render(<App a={1} />, scratch);

			let change = getChangeDescription(getRendererd(scratch));
			expect(change).to.deep.equal({
				context: false,
				didHooksChange: false,
				isFirstMount: false,
				props: null,
				state: null
			});

			render(<App a={2} />, scratch);
			change = getChangeDescription(getRendererd(scratch));
			expect(change).to.deep.equal({
				context: false,
				didHooksChange: true,
				isFirstMount: false,
				props: ['a'],
				state: null
			});
		});

		it('should detect useReducer changes', () => {
			let update;
			function App() {
				let [v, set] = useReducer(() => 42, 0);
				update = set;
				return <div>counter {v}</div>;
			}

			render(<App />, scratch);
			update();
			rerender();

			let change = getChangeDescription(getRendererd(scratch));
			expect(change).to.deep.equal({
				context: false,
				didHooksChange: true,
				isFirstMount: false,
				props: null,
				state: null
			});
		});
	});
});
