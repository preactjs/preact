import { createElement, render, lazy, Suspense } from 'preact/compat';
import 'preact/debug';
import { setupRerender } from 'preact/test-utils';
import {
	setupScratch,
	teardown,
	serializeHtml
} from '../../../test/_util/helpers';

/** @jsx createElement */

describe('debug with suspense', () => {
	/** @type {HTMLDivElement} */
	let scratch;
	let rerender;
	let errors = [];
	let warnings = [];

	beforeEach(() => {
		errors = [];
		warnings = [];
		scratch = setupScratch();
		rerender = setupRerender();
		sinon.stub(console, 'error').callsFake(e => errors.push(e));
		sinon.stub(console, 'warn').callsFake(w => warnings.push(w));
	});

	afterEach(() => {
		console.error.restore();
		console.warn.restore();
		teardown(scratch);
	});

	it('should warn for an input with both value & defaultValue', () => {
		render(<input value="a" defaultValue="b" />, scratch);
		expect(console.warn).to.be.called;
		expect(warnings[1]).to.match(
			/includes both "value" and "defaultValue" props/
		);
	});
});
