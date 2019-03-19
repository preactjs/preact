// ES2015 APIs used by developer tools integration
import 'core-js/es6/map';
import 'core-js/es6/promise';
import 'core-js/fn/array/fill';
import 'core-js/fn/array/from';
import 'core-js/fn/object/assign';

// Fix Function#name on browsers that do not support it (IE).
// Taken from: https://stackoverflow.com/a/17056530/755391
if (!(function f() {}).name) {
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
