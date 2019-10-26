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

	it('should not print an error on string refs', () => {
		let fn = () => render(<div ref="a" />, scratch);
		expect(fn).to.not.throw();
		expect(console.error).to.not.be.called;
	});
});
