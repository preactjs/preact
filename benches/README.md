# Preact Benchmarks

This directory contains benchmarks for Preact, run using the polymer/tachometer project.

To run benches use the following npm scripts:

## bench

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
    $ ./scripts bench *.html
    $ ./scripts bench all

```

### Details

The `bench` command generates a tachometer config file for each benchmark matching the given globs. It then runs tachometer on each config file. If you would create one config file containing all the benchmarks, then Tachometer would produce one table comparing all package versions to each other across benchmarks which wouldn't be as useful. By generating a config per benchmark, Tachometer will output a table per benchmark comparing how each package version performed on just that benchmark.
