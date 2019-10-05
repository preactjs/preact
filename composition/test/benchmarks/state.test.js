/* eslint-disable react/display-name */
/*global coverage, ENABLE_PERFORMANCE */
/*eslint no-console:0*/
/** @jsx createElement */

import { createElement, render } from 'preact';
import { useState } from 'preact/hooks';
import { setupScratch, teardown } from '../../../test/_util/helpers';
import bench from '../../../test/_util/bench';
import { createComponent, value, reactive } from '../../src';

describe('benchmarks', function() {
	let scratch;

	this.timeout(100000);

	before(function() {
		if (!ENABLE_PERFORMANCE) this.skip();
		if (coverage) {
			console.warn(
				'WARNING: Code coverage is enabled, which dramatically reduces performance. Do not pay attention to these numbers.'
			);
		}
	});

	beforeEach(() => {
		scratch = setupScratch();
	});

	afterEach(() => {
		teardown(scratch);
	});

	it('updates value state', done => {
		function createTestCompositionRef() {
			const parent = scratch.appendChild(document.createElement('div'));

			let doIncrease;
			const Comp = createComponent(() => {
				const count = value(0);
				function increase() {
					count.value += 1;
				}
				doIncrease = increase;
				return () => <div onClick={increase}>{count.value}</div>;
			});

			render(<Comp />, parent);

			return () => doIncrease();
		}

		function createTestHooks() {
			const parent = scratch.appendChild(document.createElement('div'));

			let doIncrease;
			const Comp = () => {
				const [count, setCount] = useState(0);
				function increase() {
					setCount(c => c + 1);
				}
				doIncrease = increase;

				return <div onClick={increase}>{count}</div>;
			};

			render(<Comp />, parent);

			return () => doIncrease();
		}

		const compositionRef = createTestCompositionRef();
		const hooks = createTestHooks();

		bench({ compositionRef, hooks }, ({ text, results }) => {
			const slowdownRef = results.compositionRef.hz / results.hooks.hz;

			console.log(`value is ${slowdownRef.toFixed(2)}x 'faster':` + text);
			expect(slowdownRef).to.be.above(1.1);
			done();
		});
	});

	it('updates reactive state', done => {
		function createTestCompositionReactive() {
			const parent = scratch.appendChild(document.createElement('div'));

			let doIncrease;
			const Comp = createComponent(() => {
				const count = reactive({ up: 0, name: '' });
				function increase() {
					count.up += 1;
				}
				doIncrease = increase;
				return () => <div onClick={increase}>{count.up}</div>;
			});

			render(<Comp />, parent);

			return () => doIncrease();
		}

		function createTestHooks() {
			const parent = scratch.appendChild(document.createElement('div'));

			let doIncrease;
			const Comp = () => {
				const [state, setState] = useState({ up: 0, name: '' });
				function increase() {
					setState(s => ({ ...s, up: s.up + 1 }));
				}
				doIncrease = increase;

				return <div onClick={increase}>{state.up}</div>;
			};

			render(<Comp />, parent);

			return () => doIncrease();
		}

		const compositionReactive = createTestCompositionReactive();
		const hooks = createTestHooks();

		bench({ compositionReactive, hooks }, ({ text, results }) => {
			const slowdownReactive =
				results.compositionReactive.hz / results.hooks.hz;

			console.log(
				`reactive is ${slowdownReactive.toFixed(2)}x 'faster':` + text
			);
			expect(slowdownReactive).to.be.above(1.1);
			done();
		});
	});

	it('updates reactive slower than value', done => {
		function createTestCompositionRef() {
			const parent = scratch.appendChild(document.createElement('div'));

			let doIncrease;
			const Comp = createComponent(() => {
				const count = value(0);
				function increase() {
					count.value += 1;
				}
				doIncrease = increase;
				return () => <div onClick={increase}>{count.value}</div>;
			});

			render(<Comp />, parent);

			return () => doIncrease();
		}

		function createTestCompositionReactive() {
			const parent = scratch.appendChild(document.createElement('div'));

			let doIncrease;
			const Comp = createComponent(() => {
				const count = reactive({ value: 0 });
				function increase() {
					count.value += 1;
				}
				doIncrease = increase;
				return () => <div onClick={increase}>{count.value}</div>;
			});

			render(<Comp />, parent);

			return () => doIncrease();
		}

		const compositionReactive = createTestCompositionReactive();
		const compositionRef = createTestCompositionRef();

		bench({ compositionReactive, compositionRef }, ({ text, results }) => {
			const slowdownReactive =
				results.compositionReactive.hz / results.compositionRef.hz;

			console.log(
				`reactive is ${slowdownReactive.toFixed(2)}x 'slower':` + text
			);
			expect(slowdownReactive).to.be.below(0.5);
			done();
		});
	});

	it('updates reactive immutable slower than value', done => {
		function createTestCompositionRef() {
			const parent = scratch.appendChild(document.createElement('div'));

			let doIncrease;
			const Comp = createComponent(() => {
				const count = value(0);
				function increase() {
					count.value += 1;
				}
				doIncrease = increase;
				return () => <div onClick={increase}>{count.value}</div>;
			});

			render(<Comp />, parent);

			return () => doIncrease();
		}

		function createTestCompositionReactive() {
			const parent = scratch.appendChild(document.createElement('div'));

			let doIncrease;
			const Comp = createComponent(() => {
				const count = reactive({ value: 0 });
				function increase() {
					count.$value = { value: count.value + 1 };
				}
				doIncrease = increase;
				return () => <div onClick={increase}>{count.value}</div>;
			});

			render(<Comp />, parent);

			return () => doIncrease();
		}

		const compositionReactive = createTestCompositionReactive();
		const compositionRef = createTestCompositionRef();

		bench({ compositionReactive, compositionRef }, ({ text, results }) => {
			const slowdownReactive =
				results.compositionReactive.hz / results.compositionRef.hz;

			console.log(
				`reactive is ${slowdownReactive.toFixed(2)}x 'slower':` + text
			);
			expect(slowdownReactive).to.be.above(0.5);
			done();
		});
	});
});
