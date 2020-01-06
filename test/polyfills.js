// ES2015 APIs used by developer tools integration
import 'core-js/es6/map';
import 'core-js/es6/promise';
import 'core-js/fn/array/fill';
import 'core-js/fn/array/from';
import 'core-js/fn/array/find';
import 'core-js/fn/array/includes';
import 'core-js/fn/string/includes';
import 'core-js/fn/object/assign';
import 'core-js/fn/string/starts-with';
import 'core-js/fn/string/code-point-at';
import 'core-js/fn/string/from-code-point';
import 'core-js/fn/string/repeat';

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

/* global chai */
chai.use((chai, util) => {
	const Assertion = chai.Assertion;

	Assertion.addMethod('equalNode', function(expectedNode, message) {
		const obj = this._obj;
		message = message || 'equalNode';

		if (expectedNode == null) {
			this.assert(
				obj == null,
				`${message}: expected node to "== null" but got #{act} instead.`,
				`${message}: expected node to not "!= null".`,
				expectedNode,
				obj
			);
		} else {
			new Assertion(obj).to.be.instanceof(Node, message);
			this.assert(
				obj.tagName === expectedNode.tagName,
				`${message}: expected node to have tagName #{exp} but got #{act} instead.`,
				`${message}: expected node to not have tagName #{act}.`,
				expectedNode.tagName,
				obj.tagName
			);
			this.assert(
				obj === expectedNode,
				`${message}: expected #{this} to be #{exp} but got #{act}`,
				`${message}: expected #{this} not to be #{exp}`,
				expectedNode,
				obj
			);
		}
	});
});
