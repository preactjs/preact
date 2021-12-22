* Add `preact-release` proxy
	- to capture slowdowns overtime
* Report `initial-run` metric to PR
	- to capture unoptimized runtime which would be an important metric to understand perf characteristic before optimizations kick in
* Add warmup reporting to all benchmarks
* Add `preact-compat` proxy
* Add UIBench
* Add bench mimicking speedometer
* Add a realworld-like bench?
* Add a specialized bench that hits certain code paths other's miss (e.g. style attribute handling?)
