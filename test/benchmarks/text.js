/*global coverage, ENABLE_PERFORMANCE, NODE_ENV*/
/*eslint no-console:0*/
/** @jsx createElement */

import { setupScratch, teardown } from '../_util/helpers';
import bench from '../_util/bench';
const { createElement, render } = require(NODE_ENV==='production' ? '../../dist/ceviche.min.js' : '../../dist/ceviche');
const preact = require('../fixtures/preact');
const MULTIPLIER = ENABLE_PERFORMANCE ? (coverage ? 5 : 1) : 999999;

describe('benchmarks', function() {
	let scratch;

	this.timeout(100000);

	before(function () {
		if (!ENABLE_PERFORMANCE) this.skip();
		if (coverage) {
			console.warn('WARNING: Code coverage is enabled, which dramatically reduces performance. Do not pay attention to these numbers.');
		}
	});

	beforeEach(() => {
		scratch = setupScratch();
	});

	afterEach(() => {
		teardown(scratch);
	});

	it('in-place text update', done => {
		const parent = document.createElement('div');
		parent.id = 'preact';
		scratch.appendChild(parent);

		function component(createElement, randomValue) {
			return (
				<div>
					<h2>Preact {randomValue}</h2>
					<h1>==={randomValue}===</h1>
				</div>
			);
		}
		render(component(createElement, 0), parent);

		const parent2 = document.createElement('div');
		parent2.id = 'vanilla';
		let div, h1, h2, text1, text2;
		parent2.appendChild(div = document.createElement('div'));
		div.appendChild(h2 = document.createElement('h2'));
		h2.appendChild(document.createTextNode('Vanilla '));
		h2.appendChild(text1 = document.createTextNode('0'));
		div.appendChild(h1 = document.createElement('h1'));
		h1.appendChild(document.createTextNode('==='));
		h1.appendChild(text2 = document.createTextNode('0'));
		h1.appendChild(document.createTextNode('==='));
		scratch.appendChild(parent2);

		bench({
			vanilla(i) {
				const t = i%1000;
				text1.data = '' + t;
				text2.data = '' + t;
			},
			preact(i) {
				preact.render(component(preact.h, i % 1000), parent);
			},
			ceviche(i) {
				render(component(createElement, i % 1000), parent);
			}
		}, ({ text, results }) => {
			const THRESHOLD = 10 * MULTIPLIER;
			// const slowdown = Math.sqrt(results.ceviche.hz * results.vanilla.hz);
			const slowdown = results.vanilla.hz / results.ceviche.hz;
			console.log(`in-place text update is ${slowdown.toFixed(2)}x slower:` + text);
			expect(slowdown).to.be.below(THRESHOLD);
			done();
		});
	});
});
