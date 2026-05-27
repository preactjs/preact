import { expect, describe } from 'vitest';

globalThis.context = describe;

window.addEventListener('error', () => {});

// Something that's loaded before this file polyfills Symbol object.
// We need to verify that it works in IE without that.
if (/Trident/.test(window.navigator.userAgent)) {
	window.Symbol = undefined;
}

// Fix Function#name on browsers that do not support it (IE).
// Taken from: https://stackoverflow.com/a/17056530/755391
if (!function f() {}.name) {
	Object.defineProperty(Function.prototype, 'name', {
		get() {
			let name = (this.toString().match(/^function\s*([^\s(]+)/) || [])[1];
			// For better performance only parse once, and then cache the
			// result through a new accessor for repeated access.
			Object.defineProperty(this, 'name', { value: name });
			return name;
		}
	});
}

expect.extend({
	equalNode: (obj, expected) => {
		if (expected == null) {
			return {
				pass: obj == null,
				message: () => `expected node to "== null" but got ${obj} instead.`
			};
		} else {
			return {
				pass: obj.tagName === expected.tagName && obj === expected,
				message: () =>
					`expected node to have tagName ${expected.tagName} but got ${obj.tagName} instead.`
			};
		}
	}
});
