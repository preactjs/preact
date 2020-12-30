// Most polyfills are automatically applied by our test runner

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
