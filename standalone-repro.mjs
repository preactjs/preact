// Standalone Node repro for the Sessions anchor-name collision.
//
// The bug is that two `useId()` callers in different parts of the same
// page can produce the same `Px-y` value when one mounts later than
// the other (e.g. behind `Suspense + lazy`). This script exercises
// that scenario directly against the local Preact source to make it
// easy to bisect or run a debugger.
//
// Run with:
//   pnpm install
//   node --experimental-vm-modules standalone-repro.mjs
//
// The script exits 1 if it reproduces a collision, 0 otherwise.

import {Window} from 'happy-dom';
import {fileURLToPath} from 'node:url';
import {dirname, resolve} from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));

const window = new Window();
globalThis.window = window;
globalThis.document = window.document;
globalThis.HTMLElement = window.HTMLElement;
globalThis.requestAnimationFrame = (cb) =>
	window.requestAnimationFrame(cb);
globalThis.cancelAnimationFrame = (handle) =>
	window.cancelAnimationFrame(handle);

// Resolve Preact from this checkout so the script tracks whatever
// branch you're on. Falls back to the published `dist/` if `src/`
// doesn't have an importable entry.
const compatPath = resolve(here, 'compat/dist/compat.mjs');

const {default: PreactCompat} = await import(compatPath);
const {createElement, render, Suspense, Fragment, useId, lazy} =
	PreactCompat;

function createLazy() {
	let resolver;
	const promise = new Promise((resolve) => {
		resolver = (component) => {
			resolve({default: component});
			return promise;
		};
	});
	return [lazy(() => promise), (c) => resolver(c)];
}

const root = window.document.createElement('div');
window.document.body.appendChild(root);

function Eager() {
	const id = useId();
	return createElement('p', {'data-source': 'eager', id});
}

function Late() {
	const id = useId();
	return createElement('p', {'data-source': 'late', id});
}

const [LazyLate, resolveLate] = createLazy();

function App() {
	return createElement(
		Fragment,
		null,
		createElement(Eager),
		createElement(
			Suspense,
			{fallback: createElement('span', null, 'loading')},
			createElement(LazyLate),
		),
	);
}

render(createElement(App), root);

// Wait a tick so the Suspense fallback settles before we resolve.
await new Promise((resolve) => setTimeout(resolve, 0));

console.log('After initial render:');
console.log(root.innerHTML);

await resolveLate(Late);

await new Promise((resolve) => setTimeout(resolve, 50));

console.log('\nAfter lazy resolves:');
console.log(root.innerHTML);

const eagerId = root
	.querySelector('[data-source="eager"]')
	?.getAttribute('id');
const lateId = root
	.querySelector('[data-source="late"]')
	?.getAttribute('id');

console.log('\nEager id:', eagerId);
console.log('Late id: ', lateId);

if (eagerId === lateId) {
	console.error('\n✗ COLLISION — both components got id ' + eagerId);
	process.exit(1);
} else {
	console.log('\n✓ unique ids');
	process.exit(0);
}
