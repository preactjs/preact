/**
 * In the browser, importing chai/chai.js will register to the window. In webpack it will
 * be parsed as a commonjs module, so it won't be on the window. In this file we conditionally
 * export from the window, or a webpack specific module import.
 */

import 'chai/chai.js';
import sinon from 'sinon';
import 'sinon-chai'; // Will attach automatically to chai

// @ts-ignore
window.sinon = sinon;

// @ts-ignore
const chai = window.chai;

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

window.expect = chai.expect;

export default chai;
export const expect = chai.expect;
