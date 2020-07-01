interface TachometerOptions {
	browser: string | string[];
	framework: string | string[];
	'window-size': string;
	'sample-size': number;
	horizon: string;
	timeout: number;
}

interface DeoptOptions {
	framework: string;
	timeout: number;
	open: boolean;
}

// Copied the following types from Tachometer since they don't currently export the types.
// Source: https://github.com/Polymer/tachometer/blob/d4d5116acb2d7df18035ddc36f0a3a1730841a23/src/configfile.ts#L25
// Some other relevant files:
// * https://github.com/Polymer/tachometer/blob/d4d5116acb2d7df18035ddc36f0a3a1730841a23/src/browser.ts#L51
// * https://github.com/Polymer/tachometer/blob/d4d5116acb2d7df18035ddc36f0a3a1730841a23/src/types.ts#L31

/**
 * Expected format of the top-level JSON config file. Note this interface is
 * used to generate the JSON schema for validation.
 */
interface ConfigFile {
	/**
	 * Root directory to serve benchmarks from (default current directory).
	 */
	root?: string;

	/**
	 * Minimum number of times to run each benchmark (default 50).
	 * @TJS-type integer
	 * @TJS-minimum 2
	 */
	sampleSize?: number;

	/**
	 * The maximum number of minutes to spend auto-sampling (default 3).
	 * @TJS-minimum 0
	 */
	timeout?: number;

	/**
	 * The degrees of difference to try and resolve when auto-sampling
	 * (e.g. 0ms, +1ms, -1ms, 0%, +1%, -1%, default 0%).
	 */
	horizons?: string[];

	/**
	 * Benchmarks to run.
	 * @TJS-minItems 1
	 */
	benchmarks: ConfigFileBenchmark[];

	/**
	 * Whether to automatically convert ES module imports with bare module
	 * specifiers to paths.
	 */
	resolveBareModules?: boolean;

	/**
	 * An optional reference to the JSON Schema for this file.
	 *
	 * If none is given, and the file is a valid tachometer config file,
	 * tachometer will write back to the config file to give this a value.
	 */
	$schema?: string;
}

/**
 * Expected format of a benchmark in a JSON config file.
 */
interface ConfigFileBenchmark {
	/**
	 * A fully qualified URL, or a local path to an HTML file or directory. If a
	 * directory, must contain an index.html. Query parameters are permitted on
	 * local paths (e.g. 'my/benchmark.html?foo=bar').
	 */
	url?: string;

	/**
	 * An optional label for this benchmark. Defaults to the URL.
	 */
	name?: string;

	/**
	 * Which browser to run the benchmark in.
	 *
	 * Options:
	 *   - chrome (default)
	 *   - chrome-headless
	 *   - firefox
	 *   - firefox-headless
	 *   - safari
	 *   - edge
	 *   - ie
	 */
	browser?: string | BrowserConfigs;

	/**
	 * Which time interval to measure.
	 *
	 * Options:
	 *   - callback: bench.start() to bench.stop() (default for fully qualified
	 *     URLs.
	 *   - fcp: first contentful paint (default for local paths)
	 *   - global: result returned from window.tachometerResult (or custom
	 *       expression set via measurementExpression)
	 */
	measurement?: Measurement;

	/**
	 * Expression to use to retrieve global result.  Defaults to
	 * `window.tachometerResult`.
	 */
	measurementExpression?: string;

	/**
	 * Optional NPM dependency overrides to apply and install. Only supported with
	 * local paths.
	 */
	packageVersions?: ConfigFilePackageVersion;

	/**
	 * Recursively expand this benchmark configuration with any number of
	 * variations. Useful for testing the same base configuration with e.g.
	 * multiple browers or package versions.
	 */
	expand?: ConfigFileBenchmark[];
}

type BrowserConfigs =
	| ChromeConfig
	| FirefoxConfig
	| SafariConfig
	| EdgeConfig
	| IEConfig;

interface BrowserConfigBase {
	/**
	 * Name of the browser:
	 *
	 * Options:
	 *   - chrome
	 *   - firefox
	 *   - safari
	 *   - edge
	 *   - ie
	 */
	name: BrowserName;

	/**
	 * A remote WebDriver server HTTP address to launch the browser from.
	 */
	remoteUrl?: string;

	/**
	 * The size of new windows created from this browser. Defaults to 1024x768.
	 */
	windowSize?: WindowSize;
}

interface WindowSize {
	/**
	 * Width of the browser window in pixels.
	 *
	 * @TJS-type integer
	 * @TJS-minimum 0
	 */
	width: number;

	/**
	 * Height of the browser window in pixels.
	 *
	 * @TJS-type integer
	 * @TJS-minimum 0
	 */
	height: number;
}

interface ChromeConfig extends BrowserConfigBase {
	name: 'chrome';

	/**
	 * Whether to launch the headless (no GUI) version of this browser.
	 */
	headless?: boolean;

	/**
	 * Path to the binary to use when launching this browser, instead of the
	 * default one.
	 */
	binary?: string;

	/**
	 * Additional command-line arguments to pass when launching the browser.
	 */
	addArguments?: string[];

	/**
	 * Command-line arguments that WebDriver normally adds by default when
	 * launching the browser, which you would like to omit.
	 */
	removeArguments?: string[];

	/**
	 * Optional CPU Throttling rate. (1 is no throttle, 2 is 2x slowdown,
	 * etc). This is currently only supported in headless mode.
	 * @TJS-minimum 1
	 */
	cpuThrottlingRate?: number;
}

interface FirefoxConfig extends BrowserConfigBase {
	name: 'firefox';

	/**
	 * Whether to launch the headless (no GUI) version of this browser.
	 */
	headless?: boolean;

	/**
	 * Path to the binary to use when launching this browser, instead of the
	 * default one.
	 */
	binary?: string;

	/**
	 * Additional command-line arguments to pass when launching the browser.
	 */
	addArguments?: string[];

	/**
	 * Advanced preferences that are usually set from the about:config page
	 * in Firefox (see
	 * https://support.mozilla.org/en-US/kb/about-config-editor-firefox).
	 */
	preferences?: { [name: string]: string | number | boolean };
}

interface SafariConfig extends BrowserConfigBase {
	name: 'safari';
}

interface EdgeConfig extends BrowserConfigBase {
	name: 'edge';
}

interface IEConfig extends BrowserConfigBase {
	name: 'ie';
}

interface ConfigFilePackageVersion {
	/**
	 * Required label to identify this version map.
	 */
	label: string;

	/**
	 * Map from NPM package to version. Any version syntax supported by NPM is
	 * supported here.
	 */
	dependencies: PackageDependencyMap;
}

type BrowserName = 'chrome' | 'firefox' | 'safari' | 'edge' | 'ie';

/**
 * A mapping from NPM package name to version specifier, as used in a
 * package.json's "dependencies" and "devDependencies".
 */
interface PackageDependencyMap {
	[pkg: string]: string;
}

/** The kinds of intervals we can measure. */
type Measurement = 'callback' | 'fcp' | 'global';
