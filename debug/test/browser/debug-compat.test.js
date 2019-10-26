import { createElement, render } from 'preact/compat';
import { initDebug } from '../../src/debug';
import { setupScratch, teardown } from '../../../test/_util/helpers';

/** @jsx createElement */

initDebug();

describe('debug with compat', () => {
	let scratch;
	let errors = [];
	let warnings = [];

	beforeEach(() => {
		errors = [];
		warnings = [];
		scratch = setupScratch();
		sinon.stub(console, 'error').callsFake(e => errors.push(e));
		sinon.stub(console, 'warn').callsFake(w => warnings.push(w));
	});

	afterEach(() => {
		(console.error).restore();
		console.warn.restore();
		teardown(scratch);
	});

	// TODO: This test only passed before because the old test first rendered
	// a string ref and expected an error. Then it rerendered a vnode with the
	// same string ref and did not expect an error. The rerender didn't throw
	// an error because the diff saw the oldVNode and the newVNode as having
	// the same ref ("a") and so it didn't try to apply it. It had nothing to do
	// with the "$$typeof" property being present which the old test seems to imply
	it.skip('should not print an error on string refs', () => {
		let fn = () => render(<div ref="a" />, scratch);
		expect(fn).to.not.throw();
		expect(console.error).to.not.be.called;
	});
});
