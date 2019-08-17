import { setupScratch, teardown } from '../../../../test/_util/helpers';
import { useState, useMemo, useReducer } from 'preact/hooks';
import { setupRerender } from 'preact/test-utils';
import { h, render, Component } from 'preact';
import { getChangeDescription, createProfiler, getTimings } from '../../../src/devtools/profiling';
import { initDevTools } from '../../../src/devtools';
import { createMockDevtoolsHook } from './mock-hook';
import { createIdMapper } from '../../../src/devtools/cache';

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

	describe('Profiler', () => {
		it('should start a profiling session', () => {
			const profiler = createProfiler();
			profiler.start();

			const { running, startTime } = profiler.state;
			expect(running).to.equal(true);
			expect(isNaN(startTime)).to.equal(false);

			profiler.start();
			expect(profiler.state.running).to.equal(true);
			expect(profiler.state.startTime).to.equal(startTime);
		});

		it('should stop a profiling session', () => {
			const profiler = createProfiler();
			profiler.start();
			profiler.stop();
			expect(profiler.state.running).to.equal(false);
			expect(isNaN(profiler.state.startTime)).to.equal(true);
		});

		it('should throw when trying to prepare data when not in profiling mode', () => {
			const profiler = createProfiler();
			const fn = () => profiler.prepareCommit(1);
			expect(fn).to.throw();
		});

		it('should prepare a commit', () => {
			const rootId = 1;
			const profiler = createProfiler();
			const { state } = profiler;
			profiler.start();
			profiler.prepareCommit(rootId);

			expect(state.commit.changed.size).to.equal(0);
			expect(state.commit.commitTime > 0).to.equal(true);
			expect(state.data.get(rootId).length).to.equal(1);

			// Should append to existing data
			profiler.prepareCommit(1);
			expect(state.commit.changed.size).to.equal(0);
			expect(state.commit.commitTime > 0).to.equal(true);
			expect(state.data.get(1).length).to.equal(2);
		});
	});

	describe('getChangeDescription', () => {
		it('should detect prop changes', () => {
			class App extends Component {
				render() {
					return <div>foo</div>;
				}
			}

			render(<App a="1" />, scratch);
			render(<App a="1" />, scratch);

			let change = getChangeDescription(getRendererd(scratch));
			expect(change).to.deep.equal({
				context: false,
				didHooksChange: false,
				isFirstMount: false,
				props: null,
				state: null
			});

			render(<App a="2" />, scratch);

			change = getChangeDescription(getRendererd(scratch));
			expect(change).to.deep.equal({
				context: false,
				didHooksChange: false,
				isFirstMount: false,
				props: ['a'],
				state: null
			});
		});

		it('should detect state changes', () => {
			let update;
			class App extends Component {
				constructor(props) {
					super(props);
					this.state = { value: 1 };
					update = v => this.setState({ value: v });
				}
				render() {
					return <div>foo</div>;
				}
			}

			render(<App />, scratch);
			update(1);
			rerender();

			let change = getChangeDescription(getRendererd(scratch));
			expect(change).to.deep.equal({
				context: false,
				didHooksChange: false,
				isFirstMount: false,
				props: null,
				state: null
			});

			update(2);
			rerender();

			change = getChangeDescription(getRendererd(scratch));
			expect(change).to.deep.equal({
				context: false,
				didHooksChange: false,
				isFirstMount: false,
				props: null,
				state: ['value']
			});
		});

		it('should ignore changes for DOM nodes', () => {
			render(<div>foo</div>, scratch);
			let change = getChangeDescription(getRendererd(scratch));
			expect(change).to.equal(null);
		});

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

	describe('getTimings', () => {
		it('should be empty when nothing was profiled', () => {
			const profiler = createProfiler();
			const mapper = createIdMapper();
			expect(getTimings(profiler, mapper)).to.deep.equal([]);
		});

		it('should contain profiling commit data', () => {
			const rootId = 999;
			const profiler = createProfiler();
			profiler.state.initial.set(1, 11);
			profiler.state.initial.set(2, 22);

			/** @type {import('../../../src/internal').ChangeDescription} */
			const changeDesc = {
				context: null,
				didHooksChange: false,
				isFirstMount: false,
				props: null,
				state: null
			};

			const data = {
				timings: [1, 12, 13, 2, 22, 23, 3, 3, 3],
				commitTime: 123,
				changed: new Map([
					[1, changeDesc]
				])
			};
			profiler.state.data.set(rootId, [data]);
			const mapper = createIdMapper();
			expect(getTimings(profiler, mapper)).to.deep.equal([{
				commitData: [
					{
						changeDescriptions: [
							[1, changeDesc]
						],
						duration: 22,
						fiberActualDurations: [
							[1, 12],
							[2, 22],
							[3, 3]
						],
						fiberSelfDurations: [
							[1, 13],
							[2, 23],
							[3, 3]
						],
						interactionIDs: [],
						priorityLevel: null,
						timestamp: 123
					}
				],
				displayName: 'Unknown',
				initialTreeBaseDurations: [[1, 11], [2, 22]],
				interactionCommits: [],
				interactions: [],
				rootID: rootId
			}]);
		});
	});
});
