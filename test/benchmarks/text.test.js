/*global COVERAGE, ENABLE_PERFORMANCE */
/*eslint no-console:0*/
/** @jsx createElement */

import { setupScratch, teardown } from '../_util/helpers';
import bench from '../_util/bench';
import preact8 from '../fixtures/preact';
import * as preactX from '../../dist/preact.module';
const MULTIPLIER = ENABLE_PERFORMANCE ? (COVERAGE ? 5 : 1) : 999999;

describe('benchmarks', function () {
	let scratch;

	this.timeout(100000);

	before(function () {
		if (!ENABLE_PERFORMANCE) this.skip();
		if (COVERAGE) {
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

	it('in-place text update', done => {
		function createTest({ createElement, render }) {
			const parent = document.createElement('div');
			scratch.appendChild(parent);

			function component(randomValue) {
				return (
					<div>
						<h2>Test {randomValue}</h2>
						<h1>==={randomValue}===</h1>
					</div>
				);
			}

			return value => {
				const t = value % 100;
				render(component(t), parent);
			};
		}

		function createVanillaTest() {
			const parent = document.createElement('div');
			let div, h1, h2, text1, text2;
			parent.appendChild((div = document.createElement('div')));
			div.appendChild((h2 = document.createElement('h2')));
			h2.appendChild(document.createTextNode('Vanilla '));
			h2.appendChild((text1 = document.createTextNode('0')));
			div.appendChild((h1 = document.createElement('h1')));
			h1.appendChild(document.createTextNode('==='));
			h1.appendChild((text2 = document.createTextNode('0')));
			h1.appendChild(document.createTextNode('==='));
			scratch.appendChild(parent);

			return value => {
				const t = value % 100;
				text1.data = '' + t;
				text2.data = '' + t;
			};
		}

		const preact8Test = createTest(preact8);
		const preactXTest = createTest(preactX);
		const vanillaTest = createVanillaTest();

		for (let i = 100; i--; ) {
			preact8Test(i);
			preactXTest(i);
			vanillaTest(i);
		}

		bench(
			{
				vanilla: vanillaTest,
				preact8: preact8Test,
				preactX: preactXTest
			},
			({ text, results }) => {
				const THRESHOLD = 10 * MULTIPLIER;
				// const slowdown = Math.sqrt(results.preactX.hz * results.vanilla.hz);
				const slowdown = results.vanilla.hz / results.preactX.hz;
				console.log(
					`in-place text update is ${slowdown.toFixed(2)}x slower:` + text
				);
				expect(slowdown).to.be.below(THRESHOLD);
				done();
			}
		);
	});
});
