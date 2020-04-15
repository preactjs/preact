# Preact Benchmarks

This directory contains benchmarks for Preact, run using the [`polymer/tachometer`](https://github.com/polymer/tachometer) project.

## Getting Started

To run and debug benches use the following npm scripts:

### bench

Use the `npm bench` command to run some (or all, the default) benchmarks locally.

```text
> node ./scripts bench "--help"

  Description
    Run the benchmarks matching the given globs.
    The root for the globs is the "src" directory.
    Specify "all" to run all benchmarks.
    To get more help on options, see polymer/tachometer help.
		Result table is printed to stdout and written to a csv and json file in the results directory.

  Usage
    $ ./scripts bench [globs] [options]

  Options
    -n, --sample-size    Minimum number of times to run each benchmark  (default 50)
    --horizon            The degrees of difference to try and resolve when auto-sampling ("N%" or "Nms", comma-delimited)  (default 10%)
    --timeout            The maximum number of minutes to spend auto-sampling  (default 3)
    -h, --help           Displays this message

  Examples
    $ ./scripts bench text*
    $ ./scripts bench **/*.html
    $ ./scripts bench all

```

The `bench` command generates a tachometer config file for each benchmark matching the given globs. It then runs tachometer on each config file. If you would create one config file containing all the benchmarks, then Tachometer would produce one table comparing all package versions to each other across benchmarks which wouldn't be as useful. By generating a config per benchmark, Tachometer will output a table per benchmark comparing how each package version performed on just that benchmark.

### start

Use the `npm start` command to start the benchmark server but not run the benchmarks. This command is useful to debug or profile how a benchmark is doing. Tachometer starts a web server for each package version we run (note the port difference per package version in the sample output below). It provides a sample URL at which to point your browser to run a benchmark. You can run any benchmark in the `src` directory, not just the one in the sample URL.

```bash
> npm start

...snipped some debug output...

Visit these URLs in any browser:

text_update [@preact8]
http://127.0.0.1:8080/src/text_update.html

text_update [@preact10]
http://127.0.0.1:8081/src/text_update.html

text_update [@preactLocal]
http://127.0.0.1:8082/src/text_update.html
```

## Contributing

To contribute a new benchmark, look at the existing benchmarks (the HTML files in `src`) to get an idea of what a benchmark can look like. Then read up on how [`polymer/tachometer`](https://github.com/polymer/tachometer) works to understand some of the options available to you.

Add an HTML file containing the benchmark you'd like to run. Use `npm start` (documented above) to test and debug your benchmark. Then run `npm bench YOUR_BENCH.html` to run it. Note while initialling developing it may be easier to limit the amount of samples taken while benching. Use the options documented for the `npm bench` command to customize the sample size and auto-sample timeout.

Currently this infra is only setup to run benchmarks against different preact versions and requires that your benchmark use the `bench.start()` and `bench.stop()` methods.

The `src/util.js` file contains some utility functions for running your benchmark. For, example the `afterFrame/afterFrameAsync` functions can be used to run `bench.stop()` after the browser as painted the next frame. The `testElement/testElementText` functions can be used to verify that the benchmark implementation rendered the expected result properly.
