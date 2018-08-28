/*global coverage, ENABLE_PERFORMANCE, NODE_ENV*/
/*eslint no-console:0*/
/** @jsx createElement */

global._ = require('lodash');
const Benchmark = global.Benchmark = require('benchmark');
import { setupScratch, teardown } from './helpers';
const { createElement, render } = require(NODE_ENV==='production' ? '../../dist/ceviche.min.js' : '../../dist/ceviche');
const MULTIPLIER = ENABLE_PERFORMANCE ? (coverage ? 5 : 1) : 999999;

function bench(benches, callback) {
	return new Promise(resolve => {
		const suite = new Benchmark.Suite();

		let i = 0;
		Object.keys(benches).forEach(name => {
			let run = benches[name];
			suite.add(name, () => {
				run(++i);
			});
		});

		suite.on('complete', () => {
			const result = {
				fastest: suite.filter('fastest')[0],
				results: [],
				text: ''
			};
			const useKilo = suite.filter(b => b.hz<10000 ).length === 0;
			suite.forEach((bench, index) => {
				let r = {
					name: bench.name,
					slowdown: bench.name===result.fastest.name ? 0 : (result.fastest.hz - bench.hz) / result.fastest.hz * 100 |0,
					hz: bench.hz.toFixed(bench.hz < 100 ? 2 : 0),
					rme: bench.stats.rme.toFixed(2),
					size: bench.stats.sample.length,
					error: bench.error ? String(bench.error) : undefined
				};
				result.text += `\n  ${r.name}: ${useKilo ? `${r.hz/1000|0} kHz` : `${r.hz} Hz`}${r.slowdown ? ` (-${r.slowdown}%)` : ''}`;
				result.results[index] = result.results[r.name] = r;
			});
			resolve(result);
			if (callback) callback(result);
		});
		suite.run({ async: true });
	});
}

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

		function component(randomValue) {
			return (
				<div>
					<h2>Preact {randomValue}</h2>
					<h1>==={randomValue}===</h1>
				</div>
			);
		}
		render(component(0), parent);

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
			ceviche(i) {
				render(component(i % 1000), parent);
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
