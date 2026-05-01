import { expect } from 'chai';
import { spawnSync } from 'node:child_process';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSync } from 'esbuild';

// Boot Preact in a real `node --frozen-intrinsics` subprocess. This is the
// hardening flag Node's own Security Best Practices recommend, and the
// closest production environment users will actually run with.
//
// IMPORTANT — what this test does and does NOT cover:
//
// In current Node, `--frozen-intrinsics` does NOT directly trip the
// override-mistake bug fixed by `cloneVNode`. Node replaces every
// `.prototype.constructor` with a tamed accessor pair (getter+setter),
// the same pattern SES/Hardened JavaScript's default `overrideTaming`
// uses, so a bare `Object.assign({}, vnode)` succeeds. The bug
// reproduces only under *untamed* freezing — e.g. raw
// `Object.freeze(Object.prototype)` or hardenedjs configured with
// `overrideTaming: 'min'`. Those paths are covered as a unit by
// `object-prototype-freeze.test.js` (in-process simulation).
//
// What this subprocess test adds on top of that:
//
//   1. End-to-end smoke coverage that Preact's module init and public
//      API surface (createElement, cloneElement, isValidElement,
//      cloneVNode) all run cleanly under Node's recommended hardening
//      flag — no other code in the library relies on intrinsic
//      mutation that frozen-intrinsics would forbid.
//
//   2. A regression sentinel: if Node ever drops the override-mistake
//      taming (i.e. `Object.prototype.constructor` becomes a plain
//      non-writable data property under `--frozen-intrinsics`), this
//      test fails loudly. That would mean the bug repros under the
//      flag, and we'd need to extend `cloneVNode` use to additional
//      sites or document the new surface.
//
// The actual subprocess code lives in a sibling source file
// (`frozen-intrinsics.subprocess.js`) so it is properly linted and
// IDE-resolved rather than hidden inside a string literal. We bundle it
// with esbuild rather than depending on `dist/` artifacts so the test
// is self-contained: a fresh checkout runs it without `npm run build`
// first. esbuild is already a devDep.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const subprocessEntry = path.join(__dirname, 'frozen-intrinsics.subprocess.js');

describe('node --frozen-intrinsics compatibility', () => {
	it('Preact loads and core API works under Node hardening', () => {
		// Bundle the sibling subprocess script. Its relative imports
		// (`../../src/index`, `../../src/util`) resolve naturally from
		// `test/node/`, so esbuild produces a single self-contained ESM
		// module that raw `node` runs without a Vite/vitest resolver in
		// the loop.
		const built = buildSync({
			entryPoints: [subprocessEntry],
			bundle: true,
			format: 'esm',
			platform: 'node',
			target: 'node18',
			write: false
		});

		const tmpDir = mkdtempSync(path.join(tmpdir(), 'preact-frozen-'));
		const scriptFile = path.join(tmpDir, 'run.mjs');
		writeFileSync(scriptFile, built.outputFiles[0].text);

		const result = spawnSync(
			process.execPath,
			[
				'--frozen-intrinsics',
				// Mute the "ExperimentalWarning: Frozen intrinsics" notice
				// so stderr stays readable when the test fails.
				'--no-warnings',
				scriptFile
			],
			{ encoding: 'utf8' }
		);

		if (result.status !== 0) {
			throw new Error(
				'frozen-intrinsics subprocess failed (status=' +
					result.status +
					', signal=' +
					result.signal +
					')\nstdout:\n' +
					result.stdout +
					'\nstderr:\n' +
					result.stderr
			);
		}

		expect(result.stdout.trim()).to.equal('OK');
	});
});
