import { setupRerender } from 'preact/test-utils';
import React, {
	createElement,
	render,
	Component,
	Suspense,
	lazy,
	Fragment
} from 'preact/compat';
import { setupScratch, teardown } from '../../../test/_util/helpers';

const h = React.createElement;
/* eslint-env browser, mocha */

describe('suspense-list', () => {
	/** @type {HTMLDivElement} */
	let scratch,
		rerender,
		unhandledEvents = [];

	function onUnhandledRejection(event) {
		unhandledEvents.push(event);
	}

	beforeEach(() => {
		scratch = setupScratch();
		rerender = setupRerender();
		unhandledEvents = [];

		if ('onunhandledrejection' in window) {
			window.addEventListener('unhandledrejection', onUnhandledRejection);
		}
	});

	afterEach(() => {
		teardown(scratch);

		if ('onunhandledrejection' in window) {
			window.removeEventListener('unhandledrejection', onUnhandledRejection);

			if (unhandledEvents.length) {
				throw unhandledEvents[0].reason;
			}
		}
	});

	it('should let components appear as they resolve if no revealOrder is mentioned', () => {
		expect(true).to.eql(false);
	});

	it('should let components appear in forwards if revealOrder is forwards', () => {
		expect(true).to.eql(false);
	});

	it('should let components appear in backwards if revealOrder is backwards', () => {
		expect(true).to.eql(false);
	});

	it('should let components appear all together if revealOrder is together', () => {
		expect(true).to.eql(false);
	});

	it('should not do anything to components not wrapped in Suspense', () => {
		expect(true).to.eql(false);
	});
});
