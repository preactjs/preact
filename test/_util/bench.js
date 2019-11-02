global._ = require('lodash');
const Benchmark = (global.Benchmark = require('benchmark'));

export default function bench(benches, callback) {
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
			const useKilo = suite.filter(b => b.hz < 10000).length === 0;
			suite.forEach((bench, index) => {
				let r = {
					name: bench.name,
					slowdown:
						bench.name === result.fastest.name
							? 0
							: (((result.fastest.hz - bench.hz) / result.fastest.hz) * 100) |
							  0,
					hz: bench.hz.toFixed(bench.hz < 100 ? 2 : 0),
					rme: bench.stats.rme.toFixed(2),
					size: bench.stats.sample.length,
					error: bench.error ? String(bench.error) : undefined
				};
				result.text += `\n  ${r.name}: ${
					useKilo ? `${(r.hz / 1000) | 0} kHz` : `${r.hz} Hz`
				}${r.slowdown ? ` (-${r.slowdown}%)` : ''}`;
				result.results[index] = result.results[r.name] = r;
			});
			resolve(result);
			if (callback) callback(result);
		});
		suite.run({ async: true });
	});
}
