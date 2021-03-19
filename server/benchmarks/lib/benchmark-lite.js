export default class Suite {
	constructor(name, { iterations = 10, timeLimit = 5000 } = {}) {
		this.name = name;
		this.iterations = iterations;
		this.timeLimit = timeLimit;
		this.tests = [];
	}
	add(name, executor) {
		this.tests.push({ name, executor });
		return this;
	}
	run() {
		console.log(`  ${this.name}:`);
		const results = [];
		let fastest = 0;
		for (const test of this.tests) {
			for (let i = 0; i < 5; i++) test.executor(i);
			const result = this.runOne(test);
			if (result.hz > fastest) fastest = result.hz;
			results.push({ ...test, ...result });
		}
		const winners = results.filter((r) => r.hz === fastest).map((r) => r.name);
		console.log(`  Fastest: \x1b[32m${winners}\x1b[39m\n`);
		return this;
	}
	runOne({ name, executor }) {
		const { iterations, timeLimit } = this;
		let count = 5;
		let now = performance.now(),
			start = now,
			prev = now;
		const times = [];
		do {
			for (let i = iterations; i--; ) executor(++count);
			prev = now;
			now = performance.now();
			times.push((now - prev) / iterations);
		} while (now - start < timeLimit);
		const elapsed = now - start;
		const hz = Math.round((count / elapsed) * 1000);
		const average = toFixed(elapsed / count);
		const middle = Math.floor(times.length / 2);
		const middle2 = Math.ceil(times.length / 2);
		times.sort((a, b) => a - b);
		const median = toFixed((times[middle] + times[middle2]) / 2);
		const hzStr = hz.toLocaleString();
		const averageStr = average.toLocaleString();
		const n = times.length;
		const stdev = Math.sqrt(
			times.reduce((c, t) => c + (t - average) ** 2, 0) / (n - 1)
		);
		const p95 = toFixed((1.96 * stdev) / Math.sqrt(n));
		console.log(
			`    \x1b[36m${name}:\x1b[0m ${hzStr}/s, average: ${averageStr}ms ±${p95} (median: ${median}ms)`
		);
		return { elapsed, hz, average, median };
	}
}

const toFixed = (v) => ((v * 100) | 0) / 100;
