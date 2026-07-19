import { expect } from 'chai';
import { spawnSync } from 'node:child_process';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSync } from 'esbuild';

// Boot Preact in a real `node --frozen-intrinsics` subprocess.
//
// Note: current Node tames the override mistake under this flag (it replaces
// `Object.prototype.constructor` with an accessor pair), so this does NOT
// directly trip the bug fixed by `cloneVNode` — that path is unit-tested in
// `object-prototype-freeze.test.js`. What this adds is end-to-end smoke
// coverage that module init and the public API work under Node's recommended
// hardening flag, plus a sentinel (in the subprocess script) that fails
// loudly if a future Node drops the taming and the bug becomes reproducible
// here.
//
// The subprocess code lives in a sibling file so it is linted and
// IDE-resolved; we bundle it with esbuild (already a devDep) so the test
// runs from a fresh checkout without `npm run build`.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const subprocessEntry = path.join(__dirname, 'frozen-intrinsics.subprocess.js');

describe('node --frozen-intrinsics compatibility', () => {
	it('Preact loads and core API works under Node hardening', () => {
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
			// --no-warnings mutes the "ExperimentalWarning: Frozen intrinsics"
			// notice so stderr stays readable when the test fails.
			['--frozen-intrinsics', '--no-warnings', scriptFile],
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
