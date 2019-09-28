/* eslint-disable react/display-name */
/*global coverage, ENABLE_PERFORMANCE */
/*eslint no-console:0*/
/** @jsx createElement */

import { createElement, render } from 'preact';
import { setupScratch, teardown } from '../../../test/_util/helpers';
import bench from '../../../test/_util/bench';
import { createComponent } from '../../src';

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

	it('render', done => {
		function createTestComposition() {
			const parent = scratch.appendChild(document.createElement('div'));

			const Comp = createComponent(() => ({ randomValue }) => (
				<div>{randomValue}</div>
			));

			return value => render(<Comp randomValue={value % 100} />, parent);
		}

		function createTestHooks() {
			const parent = scratch.appendChild(document.createElement('div'));

			const Comp = ({ randomValue }) => <div>{randomValue}</div>;

			return value => render(<Comp randomValue={value % 100} />, parent);
		}

		const composition = createTestComposition();
		const hooks = createTestHooks();

		bench({ composition, hooks }, ({ text, results }) => {
			const slowdown = results.composition.hz / results.hooks.hz;

			console.log(`composition is ${slowdown.toFixed(2)}x 'faster':` + text);
			expect(slowdown).to.be.above(0.9);
			done();
		});
	});

	it('render with anonimous function', done => {
		function createTestComposition() {
			const parent = scratch.appendChild(document.createElement('div'));

			const Comp = createComponent(() => {
				function handleClick() {}
				return ({ randomValue }) => (
					<div onClick={handleClick}>{randomValue}</div>
				);
			});

			return value => render(<Comp randomValue={value % 100} />, parent);
		}

		function createTestHooks() {
			const parent = scratch.appendChild(document.createElement('div'));

			const Comp = ({ randomValue }) => {
				function handleClick() {}
				return <div onClick={handleClick}>{randomValue}</div>;
			};

			return value => render(<Comp randomValue={value % 100} />, parent);
		}

		const composition = createTestComposition();
		const hooks = createTestHooks();

		bench({ composition, hooks }, ({ text, results }) => {
			const slowdown = results.composition.hz / results.hooks.hz;

			console.log(`composition is ${slowdown.toFixed(2)}x 'faster':` + text);
			expect(slowdown).to.be.above(1.1);
			done();
		});
	});
});
